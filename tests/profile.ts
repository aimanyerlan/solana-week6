import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Profile } from "../target/types/profile";
import { assert } from "chai";

describe("profile", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.profile as Program<Profile>;
  const wallet = provider.wallet.publicKey;

  const [profilePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), wallet.toBuffer()],
    program.programId
  );

  it("create: профиль создан по адресу PDA", async () => {
    await program.methods
      .createProfile("Aiman", "Student, learning Solana")
      .accountsPartial({ profile: profilePda, user: wallet })
      .rpc();

    const acc = await program.account.profile.fetch(profilePda);
    assert.equal(acc.name, "Aiman");
    assert.equal(acc.bio, "Student, learning Solana");
    assert.equal(acc.authority.toBase58(), wallet.toBase58());
  });

  it("create второй раз: ошибка, профиль уже существует", async () => {
    let failed = false;
    try {
      await program.methods
        .createProfile("Other", "Second try")
        .accountsPartial({ profile: profilePda, user: wallet })
        .rpc();
    } catch (e) {
      failed = true;
    }
    assert.isTrue(failed);
  });

  it("update: владелец меняет данные", async () => {
    await program.methods
      .updateProfile("Aiman E.", "Building on Solana")
      .accountsPartial({ profile: profilePda, authority: wallet })
      .rpc();

    const acc = await program.account.profile.fetch(profilePda);
    assert.equal(acc.name, "Aiman E.");
    assert.equal(acc.bio, "Building on Solana");
  });

  it("update слишком длинного имени: ошибка NameTooLong", async () => {
    let message = "";
    try {
      await program.methods
        .updateProfile("x".repeat(33), "bio")
        .accountsPartial({ profile: profilePda, authority: wallet })
        .rpc();
    } catch (e: any) {
      message = e.toString();
    }
    assert.include(message, "NameTooLong");
  });

  it("чужой кошелёк не может изменить профиль", async () => {
    const other = anchor.web3.Keypair.generate();
    let failed = false;
    try {
      await program.methods
        .updateProfile("Hacked", "Hacked")
        .accountsPartial({ profile: profilePda, authority: other.publicKey })
        .signers([other])
        .rpc();
    } catch (e) {
      failed = true;
    }
    assert.isTrue(failed);
    const acc = await program.account.profile.fetch(profilePda);
    assert.equal(acc.name, "Aiman E.");
  });

  it("delete: аккаунт закрыт", async () => {
    await program.methods
      .deleteProfile()
      .accountsPartial({ profile: profilePda, authority: wallet })
      .rpc();
    const acc = await program.account.profile.fetchNullable(profilePda);
    assert.isNull(acc);
  });
});