import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ProductionCard,
  ViewerProductionState,
  WatchlistItem,
} from "@todam/contracts";
import { Link, useRouter } from "expo-router";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import {
  getTicketWatchlistLabel,
  shouldStackTicketLocation,
  updateTicketWatchlist,
} from "../lib/production-ticket";
import { ProductionPoster } from "./ProductionPoster";

const disciplineLabels: Record<ProductionCard["discipline"], string> = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
};
const compactDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export interface ProductionDiscoveryCardProps {
  distanceKm?: number | null | undefined;
  headingLevel?: 2 | 3;
  locality?: string | null | undefined;
  priority?: boolean;
  production: ProductionCard;
  showWatchlistAction?: boolean;
  startsAt?: string | null | undefined;
  venueName?: string | null | undefined;
  width?: number;
}

interface TicketSectionDimensions {
  height: number;
  width: number;
}

interface TicketDimensions {
  info: TicketSectionDimensions;
  poster: TicketSectionDimensions;
}

const DEFAULT_TICKET_WIDTH = 320;
const INFO_HEIGHT = 178;
const COMPACT_INFO_HEIGHT = 184;
const COMPACT_TICKET_MAX_WIDTH = 210;
const POSTER_ASPECT_RATIO = 210 / 148;
const TICKET_CORNER_RATIO = 18 / 320;
const TICKET_NOTCH_RATIO = 16 / 320;
const TICKET_CURVE_CONTROL_RATIO = 0.56;

function coordinate(value: number) {
  return Number(value.toFixed(3));
}

function getInitialTicketDimensions(width?: number): TicketDimensions {
  const resolvedWidth = width ?? DEFAULT_TICKET_WIDTH;

  return {
    info: {
      height:
        resolvedWidth <= COMPACT_TICKET_MAX_WIDTH ? COMPACT_INFO_HEIGHT : INFO_HEIGHT,
      width: resolvedWidth,
    },
    poster: {
      height: resolvedWidth * POSTER_ASPECT_RATIO,
      width: resolvedWidth,
    },
  };
}

function createPosterClipPath({ height, width }: TicketSectionDimensions) {
  const corner = width * TICKET_CORNER_RATIO;
  const notch = width * TICKET_NOTCH_RATIO;
  const control = notch * TICKET_CURVE_CONTROL_RATIO;

  return [
    `M${coordinate(corner)} 0`,
    `H${coordinate(width - corner)}`,
    `Q${coordinate(width)} 0 ${coordinate(width)} ${coordinate(corner)}`,
    `V${coordinate(height - notch)}`,
    `C${coordinate(width - control)} ${coordinate(height - notch)}`,
    `${coordinate(width - notch)} ${coordinate(height - control)}`,
    `${coordinate(width - notch)} ${coordinate(height)}`,
    `H${coordinate(notch)}`,
    `C${coordinate(notch)} ${coordinate(height - control)}`,
    `${coordinate(control)} ${coordinate(height - notch)}`,
    `0 ${coordinate(height - notch)}`,
    `V${coordinate(corner)}`,
    `Q0 0 ${coordinate(corner)} 0 Z`,
  ].join(" ");
}

function createInfoClipPath({ height, width }: TicketSectionDimensions) {
  const corner = width * TICKET_CORNER_RATIO;
  const notch = width * TICKET_NOTCH_RATIO;
  const control = notch * TICKET_CURVE_CONTROL_RATIO;

  return [
    `M${coordinate(notch)} 0`,
    `H${coordinate(width - notch)}`,
    `C${coordinate(width - notch)} ${coordinate(control)}`,
    `${coordinate(width - control)} ${coordinate(notch)}`,
    `${coordinate(width)} ${coordinate(notch)}`,
    `V${coordinate(height - corner)}`,
    `Q${coordinate(width)} ${coordinate(height)} ${coordinate(width - corner)} ${coordinate(height)}`,
    `H${coordinate(corner)}`,
    `Q0 ${coordinate(height)} 0 ${coordinate(height - corner)}`,
    `V${coordinate(notch)}`,
    `C${coordinate(control)} ${coordinate(notch)}`,
    `${coordinate(notch)} ${coordinate(control)}`,
    `${coordinate(notch)} 0 Z`,
  ].join(" ");
}

function createPosterOutlinePath({ height, width }: TicketSectionDimensions) {
  const corner = width * TICKET_CORNER_RATIO;
  const notch = width * TICKET_NOTCH_RATIO;
  const control = notch * TICKET_CURVE_CONTROL_RATIO;

  return [
    `M${coordinate(notch)} ${coordinate(height)}`,
    `C${coordinate(notch)} ${coordinate(height - control)}`,
    `${coordinate(control)} ${coordinate(height - notch)}`,
    `0 ${coordinate(height - notch)}`,
    `V${coordinate(corner)}`,
    `Q0 0 ${coordinate(corner)} 0`,
    `H${coordinate(width - corner)}`,
    `Q${coordinate(width)} 0 ${coordinate(width)} ${coordinate(corner)}`,
    `V${coordinate(height - notch)}`,
    `C${coordinate(width - control)} ${coordinate(height - notch)}`,
    `${coordinate(width - notch)} ${coordinate(height - control)}`,
    `${coordinate(width - notch)} ${coordinate(height)}`,
  ].join(" ");
}

function createInfoOutlinePath({ height, width }: TicketSectionDimensions) {
  const corner = width * TICKET_CORNER_RATIO;
  const notch = width * TICKET_NOTCH_RATIO;
  const control = notch * TICKET_CURVE_CONTROL_RATIO;

  return [
    `M${coordinate(notch)} 0`,
    `C${coordinate(notch)} ${coordinate(control)}`,
    `${coordinate(control)} ${coordinate(notch)}`,
    `0 ${coordinate(notch)}`,
    `V${coordinate(height - corner)}`,
    `Q0 ${coordinate(height)} ${coordinate(corner)} ${coordinate(height)}`,
    `H${coordinate(width - corner)}`,
    `Q${coordinate(width)} ${coordinate(height)} ${coordinate(width)} ${coordinate(height - corner)}`,
    `V${coordinate(notch)}`,
    `C${coordinate(width - control)} ${coordinate(notch)}`,
    `${coordinate(width - notch)} ${coordinate(control)}`,
    `${coordinate(width - notch)} 0`,
  ].join(" ");
}

function useTicketDimensions(initialWidth?: number): {
  dimensions: TicketDimensions;
  infoRef: RefObject<HTMLDivElement | null>;
  posterRef: RefObject<HTMLDivElement | null>;
} {
  const infoRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState(() =>
    getInitialTicketDimensions(initialWidth),
  );

  useEffect(() => {
    const info = infoRef.current;
    const poster = posterRef.current;

    if (!info || !poster) return;

    const updateDimensions = () => {
      const nextDimensions = {
        info: {
          height: info.getBoundingClientRect().height,
          width: info.getBoundingClientRect().width,
        },
        poster: {
          height: poster.getBoundingClientRect().height,
          width: poster.getBoundingClientRect().width,
        },
      };

      setDimensions((current) => {
        const unchanged =
          Math.abs(current.info.height - nextDimensions.info.height) < 0.1 &&
          Math.abs(current.info.width - nextDimensions.info.width) < 0.1 &&
          Math.abs(current.poster.height - nextDimensions.poster.height) < 0.1 &&
          Math.abs(current.poster.width - nextDimensions.poster.width) < 0.1;

        return unchanged ? current : nextDimensions;
      });
    };

    updateDimensions();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(info);
    observer.observe(poster);

    return () => observer.disconnect();
  }, []);

  return { dimensions, infoRef, posterRef };
}

function TicketDefinitions({
  dimensions,
  infoClipId,
  posterClipId,
}: {
  dimensions: TicketDimensions;
  infoClipId: string;
  posterClipId: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className="todam-production-ticket__definitions"
      focusable="false"
    >
      <defs>
        <clipPath id={posterClipId} clipPathUnits="userSpaceOnUse">
          <path d={createPosterClipPath(dimensions.poster)} />
        </clipPath>
        <clipPath id={infoClipId} clipPathUnits="userSpaceOnUse">
          <path d={createInfoClipPath(dimensions.info)} />
        </clipPath>
      </defs>
    </svg>
  );
}

function PosterOutline({ dimensions }: { dimensions: TicketSectionDimensions }) {
  return (
    <svg
      aria-hidden="true"
      className="todam-production-ticket__outline"
      focusable="false"
      preserveAspectRatio="none"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
    >
      <path
        className="todam-production-ticket__edge"
        d={createPosterOutlinePath(dimensions)}
      />
    </svg>
  );
}

function InfoOutline({ dimensions }: { dimensions: TicketSectionDimensions }) {
  const notch = dimensions.width * TICKET_NOTCH_RATIO;

  return (
    <svg
      aria-hidden="true"
      className="todam-production-ticket__outline"
      focusable="false"
      preserveAspectRatio="none"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
    >
      <path
        className="todam-production-ticket__edge"
        d={createInfoOutlinePath(dimensions)}
      />
      <line
        className="todam-production-ticket__perforation"
        x1={coordinate(notch)}
        x2={coordinate(dimensions.width - notch)}
        y1={1}
        y2={1}
      />
    </svg>
  );
}

function BookmarkRibbon({ gradientId }: { gradientId: string }) {
  return (
    <svg
      aria-hidden="true"
      className="todam-ticket-bookmark__ribbon"
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 44 60"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          x1="3"
          x2="41"
          y1="2"
          y2="57"
        >
          <stop offset="0%" stopColor="#FFFDF8" stopOpacity="0.3" />
          <stop offset="38%" stopColor="#F3A995" stopOpacity="0.58" />
          <stop offset="100%" stopColor="#C8B8F0" stopOpacity="0.58" />
        </linearGradient>
      </defs>
      <path
        className="todam-ticket-bookmark__surface"
        d="M0 0 H44 V58 L22 48 L0 58 Z"
      />
      <path
        className="todam-ticket-bookmark__selected-surface"
        d="M0 0 H44 V58 L22 48 L0 58 Z"
        fill={`url(#${gradientId})`}
      />
      <path className="todam-ticket-bookmark__edge" d="M0 0 H44 V58 L22 48 L0 58 Z" />
    </svg>
  );
}

function WatchlistBookmark({ production }: { production: ProductionCard }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const session = authClient.useSession();
  const [feedback, setFeedback] = useState("");
  const gradientId = `todam-watchlist-${useId().replaceAll(":", "")}`;
  const watchlist = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => api.getWatchlist(),
    enabled: Boolean(session.data),
    staleTime: 30_000,
  });
  const watchlisted =
    watchlist.data?.some((item) => item.production.id === production.id) ?? false;

  function synchronizeState(state: ViewerProductionState) {
    queryClient.setQueryData<WatchlistItem[]>(["watchlist"], (items) =>
      updateTicketWatchlist(items, production, state.watchlisted),
    );
    queryClient.setQueryData(["production-state", production.id], state);
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["home"] });
    void queryClient.invalidateQueries({ queryKey: ["my-shows"] });
  }

  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled
        ? api.addToWatchlist(production.id)
        : api.removeFromWatchlist(production.id),
    onSuccess: (state) => {
      synchronizeState(state);
      setFeedback(
        state.watchlisted
          ? `${production.title} a été ajouté à « À voir ».`
          : `${production.title} a été retiré de « À voir ».`,
      );
    },
    onError: () => {
      setFeedback("La liste « À voir » n’a pas pu être mise à jour. Réessayez.");
    },
  });

  const busy =
    session.isPending ||
    mutation.isPending ||
    Boolean(session.data && watchlist.isPending);
  const accessibilityLabel = getTicketWatchlistLabel(production.title, watchlisted);

  function toggleWatchlist() {
    if (session.isPending || mutation.isPending) return;
    if (!session.data) {
      router.push({
        pathname: "/sign-up",
        params: {
          action: "watchlist",
          returnTo: `/production/${production.slug}`,
        },
      });
      return;
    }
    if (watchlist.isError) {
      setFeedback("La liste « À voir » est indisponible. Nouvel essai en cours.");
      void watchlist.refetch();
      return;
    }
    if (watchlist.isPending) return;
    mutation.mutate(!watchlisted);
  }

  return (
    <>
      <button
        aria-busy={busy}
        aria-label={accessibilityLabel}
        aria-pressed={watchlisted}
        className="todam-ticket-bookmark"
        disabled={busy}
        onClick={toggleWatchlist}
        type="button"
      >
        <BookmarkRibbon gradientId={gradientId} />
        <span className="todam-ticket-bookmark__glyph">
          <Ionicons
            aria-hidden
            color="currentColor"
            name={watchlisted ? "checkmark" : "add"}
            size={22}
          />
        </span>
      </button>
      <span aria-live="polite" className="sr-only" role="status">
        {feedback}
      </span>
    </>
  );
}

export function ProductionDiscoveryCard({
  distanceKm,
  headingLevel = 3,
  locality,
  priority = false,
  production,
  showWatchlistAction = false,
  startsAt = production.nextPerformance,
  venueName = production.nextVenue?.name ?? production.venueNames[0] ?? null,
  width,
}: ProductionDiscoveryCardProps) {
  const sequence = useId().replaceAll(":", "");
  const posterClipId = `todam-ticket-poster-${sequence}`;
  const infoClipId = `todam-ticket-info-${sequence}`;
  const { dimensions, infoRef, posterRef } = useTicketDimensions(width);
  const clipStyle = (id: string): CSSProperties => ({
    clipPath: `url(#${id})`,
    WebkitClipPath: `url(#${id})`,
  });
  const resolvedLocality = locality ?? production.nextVenue?.locality ?? null;
  const credit = production.company?.name ?? production.primaryCredit;
  const hasLocation = Boolean(resolvedLocality || venueName);
  const stackedLocation = shouldStackTicketLocation(resolvedLocality, venueName);
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article
      aria-label={production.title}
      className="todam-production-card todam-production-ticket"
      style={width ? { width } : undefined}
    >
      <TicketDefinitions
        dimensions={dimensions}
        infoClipId={infoClipId}
        posterClipId={posterClipId}
      />
      <div className="todam-production-ticket__body">
        <div className="todam-production-ticket__poster" ref={posterRef}>
          <div
            className="todam-production-ticket__poster-surface"
            style={clipStyle(posterClipId)}
          >
            <ProductionPoster
              bleed
              discipline={production.discipline}
              poster={production.poster}
              priority={priority}
              title={production.title}
            />
          </div>
          <PosterOutline dimensions={dimensions.poster} />
        </div>
        <div className="todam-production-ticket__info" ref={infoRef}>
          <div
            className="todam-production-ticket__info-surface"
            style={clipStyle(infoClipId)}
          >
            <p className="todam-production-ticket__discipline">
              {disciplineLabels[production.discipline]}
            </p>
            <Heading className="todam-production-ticket__title">
              {production.title}
            </Heading>
            {credit ? (
              <p className="todam-production-ticket__credit">{credit}</p>
            ) : null}
            {hasLocation ? (
              <div
                className={`todam-production-ticket__location ${
                  stackedLocation
                    ? "todam-production-ticket__location--stacked"
                    : "todam-production-ticket__location--inline"
                }`}
              >
                <Ionicons aria-hidden name="location-outline" size={15} />
                <span className="todam-production-ticket__location-copy">
                  {resolvedLocality ? (
                    <strong className="todam-production-ticket__city">
                      {resolvedLocality}
                    </strong>
                  ) : null}
                  {resolvedLocality && venueName && !stackedLocation ? (
                    <span aria-hidden="true"> · </span>
                  ) : null}
                  {venueName ? (
                    <span className="todam-production-ticket__venue">{venueName}</span>
                  ) : null}
                </span>
              </div>
            ) : null}
            {startsAt ? (
              <p className="todam-production-ticket__date">
                {compactDateFormatter.format(new Date(startsAt))}
                {distanceKm !== null && distanceKm !== undefined
                  ? ` · ${distanceKm.toLocaleString("fr-FR")} km`
                  : ""}
              </p>
            ) : null}
          </div>
          <InfoOutline dimensions={dimensions.info} />
        </div>
      </div>
      <Link
        aria-label={`Ouvrir la fiche du spectacle ${production.title}`}
        className="todam-production-ticket__link"
        href={`/production/${production.slug}`}
      />
      {showWatchlistAction ? <WatchlistBookmark production={production} /> : null}
    </article>
  );
}
