use soroban_sdk::{contracttype, Address, String};

// ──────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ──────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    Admin,
    GrantCount,
    Grant(u32),
    Applications(u32),
    RewardToken,
}

// ──────────────────────────────────────────────────────────────────────────────
// Gig Status
// ──────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum GrantStatus {
    Active,
    Successful,
    Expired,
    Withdrawn,
}

// ──────────────────────────────────────────────────────────────────────────────
// Gig / Project
// ──────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct Grant {
    /// Unique gig ID (auto-incremented).
    pub id: u32,
    /// Address of the client/poster who created the gig.
    pub creator: Address,
    /// Gig title.
    pub title: String,
    /// Gig description / deliverables.
    pub description: String,
    /// Escrow funding goal in stroops (1 XLM = 10_000_000 stroops).
    pub goal: i128,
    /// Unix timestamp (seconds) after which the gig expires/closes.
    pub deadline: u64,
    /// Total amount funded/escrowed so far, in stroops.
    pub raised: i128,
    /// Current status of the gig.
    pub status: GrantStatus,
}

// ──────────────────────────────────────────────────────────────────────────────
// Application / Escrow Contribution
// ──────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct Application {
    /// Address of the freelancer/applicant who funded the escrow.
    pub donor: Address,
    /// Amount escrowed in stroops.
    pub amount: i128,
    /// Ledger timestamp when the escrow contribution was made.
    pub timestamp: u64,
}
