import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Profile } from "../target/types/profile";
import * as fs from "fs";

const explorer = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync("target/idl/profile.json", "utf8"));
  const program = new Program<Profile>(idl, provider);
  const wallet = provider.wallet.publicKey;

  const [profilePda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), wallet.toBuffer()],
    program.programId
  );
  console.log("Wallet:      ", wallet.toBase58());
  console.log("Profile PDA: ", profilePda.toBase58(), "bump:", bump);

  const existing = await program.account.profile.fetchNullable(profilePda);

  if (existing === null) {
    const sig = await program.methods
      .createProfile("Aiman", "Student, learning Solana")
      .accountsPartial({ profile: profilePda, user: wallet })
      .rpc();
    console.log("create_profile:", explorer(sig));
  } else {
    console.log("Profile already exists, skipping create");
  }

  const sig2 = await program.methods
    .updateProfile("Aiman E.", "Building on Solana")
    .accountsPartial({ profile: profilePda, authority: wallet })
    .rpc();
  console.log("update_profile:", explorer(sig2));

  const acc = await program.account.profile.fetch(profilePda);
  console.log("name:      ", acc.name);
  console.log("bio:       ", acc.bio);
  console.log("authority: ", acc.authority.toBase58());
  console.log("created_at:", new Date(acc.createdAt.toNumber() * 1000).toISOString());
}

main();