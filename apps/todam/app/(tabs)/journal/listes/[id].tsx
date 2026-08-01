import { useLocalSearchParams } from "expo-router";

import { MyListDetailScreen } from "../../../../components/MyListDetailScreen";

export default function MyListDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <MyListDetailScreen listId={Array.isArray(id) ? id[0]! : id} />;
}
