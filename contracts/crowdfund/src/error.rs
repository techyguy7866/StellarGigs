use soroban_sdk::{contracterror};

#[contracterror]
#[derive(Clone, Debug, PartialEq)]
pub enum GigError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    GigNotFound = 4,
    GigNotActive = 5,
    GigExpired = 6,
    GigNotSuccessful = 7,
    GigNotExpired = 8,
    InvalidGoal = 9,
    InvalidDeadline = 10,
    InvalidAmount = 11,
    NothingToWithdraw = 12,
    NoEscrowFound = 13,
    TransferFailed = 14,
}
