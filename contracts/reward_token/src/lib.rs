#![no_std]

/// ────────────────────────────────────────────────────────────────────────────
/// StellarGigs Reputation Token (GIG)
///
/// A simple fungible token contract used to reward freelancers on the StellarGigs
/// platform. Only the designated `admin` (set during initialization — the
/// StellarGigs contract itself) may mint new tokens. Token holders can
/// transfer tokens or check their balance.
///
/// Storage layout:
///   Instance  → Admin    (Address)
///   Instance  → Name     (String)
///   Instance  → Symbol   (String)
///   Persistent → Balance(owner: Address) → i128
/// ────────────────────────────────────────────────────────────────────────────
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, String,
};

// ── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    Admin,
    Name,
    Symbol,
    Balance(Address),
}

// ── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Clone, Debug, PartialEq)]
pub enum ReputationTokenError {
    AlreadyInitialized = 1,
    NotInitialized     = 2,
    Unauthorized       = 3,
    InvalidAmount      = 4,
    InsufficientBalance = 5,
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct ReputationTokenContract;

#[contractimpl]
impl ReputationTokenContract {
    // ── Admin ─────────────────────────────────────────────────────────────────

    /// Initialize the token with an admin (typically the StellarGigs contract).
    ///
    /// May only be called once. The admin is the only account that can mint
    /// new GIG tokens.
    pub fn initialize(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
    ) -> Result<(), ReputationTokenError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ReputationTokenError::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin,  &admin);
        env.storage().instance().set(&DataKey::Name,   &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().extend_ttl(100_000, 100_000);

        Ok(())
    }

    // ── Minting (admin-only) ──────────────────────────────────────────────────

    /// Mint `amount` GIG tokens to `to`.
    ///
    /// Only the admin (StellarGigs contract) may call this.
    pub fn mint(
        env: Env,
        to: Address,
        amount: i128,
    ) -> Result<(), ReputationTokenError> {
        // Verify caller is admin
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ReputationTokenError::NotInitialized)?;
        admin.require_auth();

        if amount <= 0 {
            return Err(ReputationTokenError::InvalidAmount);
        }

        let current = Self::balance_internal(&env, &to);
        let new_balance = current + amount;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &new_balance);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Balance(to), 100_000, 100_000);

        Ok(())
    }

    // ── Transfers ─────────────────────────────────────────────────────────────

    /// Transfer `amount` GIG tokens from `from` to `to`.
    pub fn transfer(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), ReputationTokenError> {
        from.require_auth();

        if amount <= 0 {
            return Err(ReputationTokenError::InvalidAmount);
        }

        let from_balance = Self::balance_internal(&env, &from);
        if from_balance < amount {
            return Err(ReputationTokenError::InsufficientBalance);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Balance(from), 100_000, 100_000);

        let to_balance = Self::balance_internal(&env, &to);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(to_balance + amount));
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Balance(to), 100_000, 100_000);

        Ok(())
    }

    // ── Read-Only Queries ─────────────────────────────────────────────────────

    /// Returns the GIG balance of `owner`.
    pub fn balance_of(env: Env, owner: Address) -> i128 {
        Self::balance_internal(&env, &owner)
    }

    /// Returns the token name (e.g. "StellarGigs Reputation").
    pub fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .unwrap_or_else(|| String::from_str(&env, "StellarGigs Reputation"))
    }

    /// Returns the token symbol (e.g. "GIG").
    pub fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .unwrap_or_else(|| String::from_str(&env, "GIG"))
    }

    /// Returns the admin address.
    pub fn admin(env: Env) -> Result<Address, ReputationTokenError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ReputationTokenError::NotInitialized)
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn balance_internal(env: &Env, owner: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(owner.clone()))
            .unwrap_or(0i128)
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    fn setup() -> (Env, ReputationTokenContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(ReputationTokenContract, ());
        let client = ReputationTokenContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(
            &admin,
            &String::from_str(&env, "StellarGigs Reputation"),
            &String::from_str(&env, "GIG"),
        );
        (env, client, admin)
    }

    #[test]
    fn test_initialize_and_metadata() {
        let (env, client, admin) = setup();
        assert_eq!(client.name(), String::from_str(&env, "StellarGigs Reputation"));
        assert_eq!(client.symbol(), String::from_str(&env, "GIG"));
        assert_eq!(client.admin(), admin);
    }

    #[test]
    fn test_mint_increases_balance() {
        let (env, client, _admin) = setup();
        let recipient = Address::generate(&env);
        assert_eq!(client.balance_of(&recipient), 0);
        client.mint(&recipient, &500_000_000_i128); // 50 GIG (in stroops)
        assert_eq!(client.balance_of(&recipient), 500_000_000);
    }

    #[test]
    fn test_transfer_tokens() {
        let (env, client, _admin) = setup();
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        client.mint(&sender, &1_000_000_000_i128);
        client.transfer(&sender, &receiver, &400_000_000_i128);
        assert_eq!(client.balance_of(&sender), 600_000_000);
        assert_eq!(client.balance_of(&receiver), 400_000_000);
    }

    #[test]
    fn test_double_initialize_fails() {
        let (env, client, admin) = setup();
        let result = client.try_initialize(
            &admin,
            &String::from_str(&env, "Dup"),
            &String::from_str(&env, "DUP"),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_transfer_insufficient_balance_fails() {
        let (env, client, _admin) = setup();
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let result = client.try_transfer(&sender, &receiver, &100_i128);
        assert!(result.is_err());
    }
}
