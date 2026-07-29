import { Redirect } from "expo-router";

export default function DeleteMyAccountRedirect() {
  return (
    <Redirect
      href={{
        pathname: "/profile",
        params: { section: "settings" },
      }}
    />
  );
}
