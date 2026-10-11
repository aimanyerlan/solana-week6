use anchor_lang::prelude::*;

declare_id!("nxayvSxwFd6EYet6M5pADpneAE6PNLv7Zf9Y4nP9Wrf");

const MAX_NAME: usize = 32;
const MAX_BIO: usize = 160;

#[program]
pub mod profile {
    use super::*;

    pub fn create_profile(ctx: Context<CreateProfile>, name: String, bio: String) -> Result<()> {
        require!(name.len() <= MAX_NAME, ProfileError::NameTooLong);
        require!(bio.len() <= MAX_BIO, ProfileError::BioTooLong);

        let profile = &mut ctx.accounts.profile;
        profile.authority = ctx.accounts.user.key();
        profile.name = name;
        profile.bio = bio;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.bump = ctx.bumps.profile;

        msg!("Profile created for {}", profile.authority);
        Ok(())
    }

    pub fn update_profile(ctx: Context<UpdateProfile>, name: String, bio: String) -> Result<()> {
        require!(name.len() <= MAX_NAME, ProfileError::NameTooLong);
        require!(bio.len() <= MAX_BIO, ProfileError::BioTooLong);

        let profile = &mut ctx.accounts.profile;
        profile.name = name;
        profile.bio = bio;

        msg!("Profile updated for {}", profile.authority);
        Ok(())
    }

    pub fn delete_profile(_ctx: Context<DeleteProfile>) -> Result<()> {
        msg!("Profile deleted");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Profile::INIT_SPACE,
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [b"profile", authority.key().as_ref()],
        bump = profile.bump,
        has_one = authority
    )]
    pub profile: Account<'info, Profile>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeleteProfile<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [b"profile", authority.key().as_ref()],
        bump = profile.bump,
        has_one = authority
    )]
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Profile {
    pub authority: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(160)]
    pub bio: String,
    pub created_at: i64,
    pub bump: u8,
}

#[error_code]
pub enum ProfileError {
    #[msg("Name is too long (max 32 bytes)")]
    NameTooLong,
    #[msg("Bio is too long (max 160 bytes)")]
    BioTooLong,
}