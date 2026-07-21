#![no_std]

mod types;
mod events;
mod storage;
mod error;

use soroban_sdk::{
    contract, contractimpl, contractclient, token,
    Address, Env, String, Vec,
};

use types::{Grant, Application, GrantStatus, DataKey};
use error::GigError;

pub use error::GigError as Error;

// ──────────────────────────────────────────────────────────────────────────────
// Inter-Contract Interface: GIG Reputation Token
// ──────────────────────────────────────────────────────────────────────────────

/// Client interface for the GIG Reputation Token contract.
/// This enables cross-contract calls from StellarGigsContract → ReputationTokenContract.
#[contractclient(name = "RewardTokenClient")]
pub trait RewardToken {
    fn mint(env: Env, to: Address, amount: i128);
}

// ──────────────────────────────────────────────────────────────────────────────
// Contract Entry Point
// ──────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct StellarGigsContract;

#[contractimpl]
impl StellarGigsContract {
    // ── Admin ─────────────────────────────────────────────────────────────────

    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) -> Result<(), GigError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(GigError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::GrantCount, &0u32);

        // Extend instance TTL
        env.storage()
            .instance()
            .extend_ttl(100_000, 100_000);

        Ok(())
    }

    // ── Inter-Contract: GIG Reputation Token Configuration ────────────────────

    /// Set the GIG reputation token contract address (admin-only).
    ///
    /// After this is set, every successful gig escrow contribution will automatically
    /// trigger a cross-contract `mint` call on the reputation token contract, crediting
    /// the freelancer with 1 GIG token per 1 stroop funded (1:1 ratio).
    pub fn set_reward_token(
        env: Env,
        admin: Address,
        token_address: Address,
    ) -> Result<(), GigError> {
        admin.require_auth();

        // Verify caller is the stored admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(GigError::NotInitialized)?;

        if stored_admin != admin {
            return Err(GigError::Unauthorized);
        }

        env.storage()
            .instance()
            .set(&DataKey::RewardToken, &token_address);
        env.storage()
            .instance()
            .extend_ttl(100_000, 100_000);

        Ok(())
    }

    /// Get the current GIG reputation token contract address (if configured).
    pub fn get_reward_token(env: Env) -> Option<Address> {
        env.storage()
            .instance()
            .get(&DataKey::RewardToken)
    }

    // ── Gig Management ────────────────────────────────────────────────────────

    /// Create a new freelance gig / escrow project.
    ///
    /// # Arguments
    /// * `creator`     - Client account posting the gig (must sign)
    /// * `title`       - Gig title (max 100 chars)
    /// * `description` - Short description / deliverables (max 500 chars)
    /// * `goal`        - Escrow funding goal in stroops (1 XLM = 10_000_000 stroops)
    /// * `deadline`    - Unix timestamp (seconds) for the gig deadline
    pub fn create_campaign(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        goal: i128,
        deadline: u64,
    ) -> Result<u32, GigError> {
        creator.require_auth();

        if goal <= 0 {
            return Err(GigError::InvalidGoal);
        }

        let now = env.ledger().timestamp();
        if deadline <= now {
            return Err(GigError::InvalidDeadline);
        }

        // Increment counter
        let grant_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::GrantCount)
            .unwrap_or(0u32)
            + 1;

        env.storage()
            .instance()
            .set(&DataKey::GrantCount, &grant_id);

        let grant = Grant {
            id: grant_id,
            creator: creator.clone(),
            title: title.clone(),
            description,
            goal,
            deadline,
            raised: 0i128,
            status: GrantStatus::Active,
        };

        // Persist gig
        env.storage()
            .persistent()
            .set(&DataKey::Grant(grant_id), &grant);

        // Initialize applications/escrow contributions list
        let applications: Vec<Application> = Vec::new(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Applications(grant_id), &applications);

        // Extend TTL for persistent entries
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Grant(grant_id), 100_000, 100_000);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Applications(grant_id), 100_000, 100_000);

        // Emit event
        events::grant_created(&env, grant_id, &creator, title, goal, deadline);

        Ok(grant_id)
    }

    /// Secure escrow / fund a gig with XLM.
    ///
    /// The freelancer must have pre-approved the transfer via the token contract.
    /// We use the native XLM token (Stellar Asset Contract).
    ///
    /// If a GIG reputation token is configured via `set_reward_token`, the freelancer
    /// will automatically receive GIG tokens equal to the stroops funded
    /// via a cross-contract mint call.
    pub fn donate(
        env: Env,
        campaign_id: u32,
        donor: Address,
        amount: i128,
    ) -> Result<(), GigError> {
        donor.require_auth();

        if amount <= 0 {
            return Err(GigError::InvalidAmount);
        }

        let mut grant: Grant = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(campaign_id))
            .ok_or(GigError::GigNotFound)?;

        let now = env.ledger().timestamp();

        if grant.status != GrantStatus::Active {
            return Err(GigError::GigNotActive);
        }

        if now > grant.deadline {
            // Auto-expire gig
            grant.status = GrantStatus::Expired;
            env.storage()
                .persistent()
                .set(&DataKey::Grant(campaign_id), &grant);
            return Err(GigError::GigExpired);
        }

        // Transfer XLM from freelancer to contract (escrow)
        let native_token = token::Client::new(&env, &get_native_asset(&env));
        native_token.transfer(&donor, &env.current_contract_address(), &amount);

        // Update raised/escrowed amount
        grant.raised += amount;

        // Check if escrow goal reached
        if grant.raised >= grant.goal {
            grant.status = GrantStatus::Successful;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Grant(campaign_id), &grant);

        // Record escrow contribution detail
        let mut applications: Vec<Application> = env
            .storage()
            .persistent()
            .get(&DataKey::Applications(campaign_id))
            .unwrap_or_else(|| Vec::new(&env));

        let app = Application {
            donor: donor.clone(),
            amount,
            timestamp: now,
        };
        applications.push_back(app);

        env.storage()
            .persistent()
            .set(&DataKey::Applications(campaign_id), &applications);

        // Extend TTLs
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Grant(campaign_id), 100_000, 100_000);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Applications(campaign_id), 100_000, 100_000);

        // ── Inter-Contract Call: Mint GIG Reputation Tokens ───────────────────
        // Mint GIG tokens to the freelancer as on-chain reputation proof.
        if let Some(reward_token_id) = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::RewardToken)
        {
            let reward_client = RewardTokenClient::new(&env, &reward_token_id);
            // Best-effort
            let _ = reward_client.try_mint(&donor, &amount);
        }

        // Emit event
        events::grant_funded(&env, campaign_id, &donor, amount, grant.raised);

        Ok(())
    }

    /// Release payment / withdraw funds from a fully-funded gig.
    ///
    /// Only the client (gig creator) can release payment after the escrow goal is reached.
    pub fn withdraw(
        env: Env,
        campaign_id: u32,
        creator: Address,
    ) -> Result<i128, GigError> {
        creator.require_auth();

        let mut grant: Grant = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(campaign_id))
            .ok_or(GigError::GigNotFound)?;

        if grant.creator != creator {
            return Err(GigError::Unauthorized);
        }

        if grant.status != GrantStatus::Successful {
            // Check if deadline passed and goal not reached
            let now = env.ledger().timestamp();
            if now > grant.deadline && grant.status == GrantStatus::Active {
                grant.status = GrantStatus::Expired;
                env.storage()
                    .persistent()
                    .set(&DataKey::Grant(campaign_id), &grant);
            }
            return Err(GigError::GigNotSuccessful);
        }

        let amount = grant.raised;

        if amount == 0 {
            return Err(GigError::NothingToWithdraw);
        }

        // Transfer funds to client (payment release)
        let native_token = token::Client::new(&env, &get_native_asset(&env));
        native_token.transfer(&env.current_contract_address(), &creator, &amount);

        // Mark as paid out
        grant.raised = 0;
        grant.status = GrantStatus::Withdrawn;
        env.storage()
            .persistent()
            .set(&DataKey::Grant(campaign_id), &grant);

        // Emit event
        events::funds_claimed(&env, campaign_id, &creator, amount);

        Ok(amount)
    }

    /// Claim escrow refund if the gig expired without meeting its escrow goal.
    pub fn refund(
        env: Env,
        campaign_id: u32,
        donor: Address,
    ) -> Result<i128, GigError> {
        donor.require_auth();

        let mut grant: Grant = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(campaign_id))
            .ok_or(GigError::GigNotFound)?;

        let now = env.ledger().timestamp();

        // Gig must be expired
        if grant.status == GrantStatus::Active && now > grant.deadline {
            grant.status = GrantStatus::Expired;
            env.storage()
                .persistent()
                .set(&DataKey::Grant(campaign_id), &grant);
        }

        if grant.status != GrantStatus::Expired {
            return Err(GigError::GigNotExpired);
        }

        // Find the freelancer's total escrow contributions
        let applications: Vec<Application> = env
            .storage()
            .persistent()
            .get(&DataKey::Applications(campaign_id))
            .unwrap_or_else(|| Vec::new(&env));

        let mut refund_amount: i128 = 0;
        let mut new_apps: Vec<Application> = Vec::new(&env);

        for app in applications.iter() {
            if app.donor == donor {
                refund_amount += app.amount;
            } else {
                new_apps.push_back(app);
            }
        }

        if refund_amount == 0 {
            return Err(GigError::NoEscrowFound);
        }

        // Transfer escrow refund
        let native_token = token::Client::new(&env, &get_native_asset(&env));
        native_token.transfer(
            &env.current_contract_address(),
            &donor,
            &refund_amount,
        );

        // Update gig and application records
        grant.raised -= refund_amount;
        env.storage()
            .persistent()
            .set(&DataKey::Grant(campaign_id), &grant);
        env.storage()
            .persistent()
            .set(&DataKey::Applications(campaign_id), &new_apps);

        // Emit event
        events::refund_issued(&env, campaign_id, &donor, refund_amount);

        Ok(refund_amount)
    }

    // ── Read-Only Queries ─────────────────────────────────────────────────────

    /// Get a single gig by ID.
    pub fn get_campaign(env: Env, campaign_id: u32) -> Result<Grant, GigError> {
        env.storage()
            .persistent()
            .get(&DataKey::Grant(campaign_id))
            .ok_or(GigError::GigNotFound)
    }

    /// Get total number of gigs.
    pub fn get_campaign_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::GrantCount)
            .unwrap_or(0u32)
    }

    /// Get all gigs (paginated).
    pub fn get_campaigns(env: Env, start_id: u32, limit: u32) -> Vec<Grant> {
        let total: u32 = env
            .storage()
            .instance()
            .get(&DataKey::GrantCount)
            .unwrap_or(0u32);

        let mut result: Vec<Grant> = Vec::new(&env);
        let end = (start_id + limit).min(total + 1);

        for id in start_id..end {
            if let Some(grant) = env
                .storage()
                .persistent()
                .get::<DataKey, Grant>(&DataKey::Grant(id))
            {
                result.push_back(grant);
            }
        }

        result
    }

    /// Get all escrow contributions/applications for a gig.
    pub fn get_donations(env: Env, campaign_id: u32) -> Vec<Application> {
        env.storage()
            .persistent()
            .get(&DataKey::Applications(campaign_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get the admin address.
    pub fn get_admin(env: Env) -> Result<Address, GigError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(GigError::NotInitialized)
    }

    /// Extend a gig's deadline.
    pub fn extend_deadline(
        env: Env,
        campaign_id: u32,
        creator: Address,
        new_deadline: u64,
    ) -> Result<(), GigError> {
        creator.require_auth();

        let mut grant: Grant = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(campaign_id))
            .ok_or(GigError::GigNotFound)?;

        if grant.creator != creator {
            return Err(GigError::Unauthorized);
        }

        if grant.status != GrantStatus::Active {
            return Err(GigError::GigNotActive);
        }

        let now = env.ledger().timestamp();
        if new_deadline <= now || new_deadline <= grant.deadline {
            return Err(GigError::InvalidDeadline);
        }

        grant.deadline = new_deadline;
        env.storage()
            .persistent()
            .set(&DataKey::Grant(campaign_id), &grant);

        Ok(())
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/// Returns the Stellar native asset (XLM) contract address.
fn get_native_asset(env: &Env) -> Address {
    Address::from_str(
        env,
        "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    )
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        Address, Env, String,
    };

    fn create_env() -> Env {
        let env = Env::default();
        env.mock_all_auths();
        env
    }

    fn setup_contract(env: &Env) -> (StellarGigsContractClient<'_>, Address) {
        let contract_id = env.register(StellarGigsContract, ());
        let client = StellarGigsContractClient::new(env, &contract_id);
        let admin = Address::generate(env);
        client.initialize(&admin);
        (client, admin)
    }

    #[test]
    fn test_initialize() {
        let env = create_env();
        let contract_id = env.register(StellarGigsContract, ());
        let client = StellarGigsContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        assert_eq!(client.get_admin(), admin);
        assert_eq!(client.get_campaign_count(), 0u32);
    }

    #[test]
    fn test_double_initialize_fails() {
        let env = create_env();
        let (client, admin) = setup_contract(&env);
        let result = client.try_initialize(&admin);
        assert!(result.is_err());
    }

    #[test]
    fn test_create_campaign() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);

        let creator = Address::generate(&env);
        let title = String::from_str(&env, "Build a DeFi Dashboard");
        let description = String::from_str(&env, "Full-stack Stellar DeFi dashboard with escrow");
        let goal: i128 = 1_000_000_000;
        let deadline: u64 = env.ledger().timestamp() + 86_400;

        let id = client.create_campaign(&creator, &title, &description, &goal, &deadline);
        assert_eq!(id, 1u32);
        assert_eq!(client.get_campaign_count(), 1u32);

        let grant = client.get_campaign(&1u32);
        assert_eq!(grant.creator, creator);
        assert_eq!(grant.goal, goal);
        assert_eq!(grant.raised, 0);
        assert_eq!(grant.status, GrantStatus::Active);
    }

    #[test]
    fn test_create_campaign_invalid_goal_fails() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);
        let creator = Address::generate(&env);
        let deadline = env.ledger().timestamp() + 86_400;
        let result = client.try_create_campaign(
            &creator,
            &String::from_str(&env, "Bad"),
            &String::from_str(&env, "Bad desc"),
            &0_i128,
            &deadline,
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_set_reward_token() {
        let env = create_env();
        let (client, admin) = setup_contract(&env);
        let fake_token = Address::generate(&env);
        client.set_reward_token(&admin, &fake_token);
        assert_eq!(client.get_reward_token(), Some(fake_token));
    }

    #[test]
    fn test_set_reward_token_unauthorized_fails() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);
        let attacker = Address::generate(&env);
        let fake_token = Address::generate(&env);
        let result = client.try_set_reward_token(&attacker, &fake_token);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_campaigns_paginated() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);
        let creator = Address::generate(&env);
        let deadline = env.ledger().timestamp() + 86_400;

        for i in 1u32..=3 {
            let title = String::from_str(&env, "Gig Project");
            let desc = String::from_str(&env, "Description");
            client.create_campaign(&creator, &title, &desc, &1_000_000_i128, &deadline);
            assert_eq!(client.get_campaign_count(), i);
        }

        let page = client.get_campaigns(&1u32, &2u32);
        assert_eq!(page.len(), 2);
        let page2 = client.get_campaigns(&3u32, &2u32);
        assert_eq!(page2.len(), 1);
    }

    #[test]
    fn test_extend_deadline() {
        let env = create_env();
        let (client, _admin) = setup_contract(&env);
        let creator = Address::generate(&env);
        let original_deadline = env.ledger().timestamp() + 86_400;
        client.create_campaign(
            &creator,
            &String::from_str(&env, "T"),
            &String::from_str(&env, "D"),
            &1_000_000_i128,
            &original_deadline,
        );
        let new_deadline = original_deadline + 86_400;
        client.extend_deadline(&1u32, &creator, &new_deadline);
        let grant = client.get_campaign(&1u32);
        assert_eq!(grant.deadline, new_deadline);
    }
}
