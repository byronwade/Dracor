import { redirect } from "next/navigation";

export default function NewCharacterPage() {
  redirect("/account/characters/new");
}
