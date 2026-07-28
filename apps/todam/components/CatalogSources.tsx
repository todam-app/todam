import type { CatalogSource, RightsStatus } from "@todam/contracts";
import { Linking, Pressable, Text, View } from "react-native";

const rightsLabels: Record<RightsStatus, string> = {
  review_required: "Droits à vérifier",
  factual_metadata_only: "Métadonnées factuelles uniquement",
  permission_granted: "Autorisation accordée",
  open_license: "Licence ouverte",
  contractual_display: "Affichage contractuellement autorisé",
  hotlink_only: "Affichage depuis la source uniquement",
  todam_original: "Contenu original Todam",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function CatalogSources({
  lastVerifiedAt,
  sources,
}: {
  lastVerifiedAt: string | null;
  sources: CatalogSource[];
}) {
  return (
    <View className="gap-3">
      {sources.length > 0 ? (
        sources.map((source) => (
          <Pressable
            accessibilityHint="Ouvre la source dans une nouvelle fenêtre"
            accessibilityRole="link"
            className="min-h-11 self-start justify-center"
            key={`${source.url}-${source.retrievedAt}`}
            onPress={() => void Linking.openURL(source.url)}
          >
            <Text className="text-base font-semibold text-accent">
              {source.title} ↗
            </Text>
            <Text className="text-xs leading-5 text-muted">
              Consultée le {dateFormatter.format(new Date(source.retrievedAt))} ·{" "}
              {rightsLabels[source.rightsStatus]}
              {source.license ? ` · ${source.license}` : ""}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text className="border-l-2 border-accent py-1 pl-4 text-base leading-6 text-muted">
          Aucune source publique n’est actuellement associée à cette fiche.
        </Text>
      )}
      {lastVerifiedAt ? (
        <Text className="text-sm text-muted">
          Dernière vérification : {dateFormatter.format(new Date(lastVerifiedAt))}
        </Text>
      ) : null}
    </View>
  );
}
