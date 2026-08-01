import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { Game } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardTitle,
  EmptyState,
  Icon,
  LoadingScreen,
} from '@superdreams/ui';

import { gradientFor, illustrationFor, type GameIllustrationKind } from '../data';
import { useGames, useStartGame, useSubmitScore } from '../hooks';

/** Decorative, self-contained SVG illustration for each game. */
function GameIllustration({ kind }: { kind: GameIllustrationKind }): JSX.Element {
  const common = 'h-20 w-20 text-white';
  switch (kind) {
    case 'spin':
      return (
        <svg viewBox="0 0 96 96" className={common} aria-hidden="true">
          <circle
            cx="48"
            cy="50"
            r="32"
            fill="rgba(255,255,255,0.15)"
            stroke="white"
            strokeWidth="3"
          />
          <g stroke="white" strokeWidth="2" opacity="0.85">
            <line x1="48" y1="18" x2="48" y2="82" />
            <line x1="16" y1="50" x2="80" y2="50" />
            <line x1="26" y1="28" x2="70" y2="72" />
            <line x1="70" y1="28" x2="26" y2="72" />
          </g>
          <circle cx="48" cy="50" r="6" fill="white" />
          <path d="M48 6 l7 14 h-14 z" fill="white" />
        </svg>
      );
    case 'scratch':
      return (
        <svg viewBox="0 0 96 96" className={common} aria-hidden="true">
          <rect
            x="14"
            y="26"
            width="68"
            height="46"
            rx="7"
            fill="rgba(255,255,255,0.15)"
            stroke="white"
            strokeWidth="3"
          />
          <g stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.7">
            <line x1="24" y1="40" x2="46" y2="40" />
            <line x1="24" y1="50" x2="40" y2="50" />
            <line x1="24" y1="60" x2="44" y2="60" />
          </g>
          <path
            transform="translate(48,37)"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"
            fill="white"
          />
        </svg>
      );
    case 'draw':
    default:
      return (
        <svg viewBox="0 0 96 96" className={common} aria-hidden="true">
          <path
            d="M20 32 h56 a4 4 0 0 1 4 4 v6 a5 5 0 0 0 0 10 v6 a4 4 0 0 1 -4 4 h-56 a4 4 0 0 1 -4 -4 v-6 a5 5 0 0 0 0 -10 v-6 a4 4 0 0 1 4 -4 z"
            fill="rgba(255,255,255,0.15)"
            stroke="white"
            strokeWidth="3"
          />
          <line
            x1="54"
            y1="34"
            x2="54"
            y2="70"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="4 5"
          />
          <path
            transform="translate(20,40)"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"
            fill="white"
          />
        </svg>
      );
  }
}

/** A single game card wired to the real start → submit-score round trip. */
function GameCard({ game }: { game: Game }): JSX.Element {
  const notify = useNotificationStore((state) => state.notify);
  const startGame = useStartGame();
  const submitScore = useSubmitScore();
  const isPlaying = startGame.isPending || submitScore.isPending;

  const handlePlay = (): void => {
    startGame.mutate(game.id, {
      onSuccess: (play) => {
        // The player's result for this round — the backend scales the reward.
        const score = Math.floor(Math.random() * (game.maxScore + 1));
        submitScore.mutate(
          { sessionId: play.session.id, score },
          {
            onSuccess: (result) => {
              notify({
                variant: 'success',
                title: `${game.name}: you won ${result.pointsAwarded.toLocaleString()} points!`,
                description: `Balance: ${result.balanceAfter.toLocaleString()} points.`,
              });
            },
            onError: (error) => {
              notify({
                variant: 'error',
                title: 'Could not submit score',
                description: error.message,
              });
            },
          },
        );
      },
      onError: (error) => {
        notify({ variant: 'error', title: 'Could not start game', description: error.message });
      },
    });
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <div
        className="relative flex h-36 items-center justify-center"
        style={{ backgroundImage: gradientFor(game.code) }}
      >
        <GameIllustration kind={illustrationFor(game.code)} />
        <span className="absolute right-3 top-3">
          <Badge variant="success">Live</Badge>
        </span>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 pt-5">
        <div className="space-y-1">
          <CardTitle>{game.name}</CardTitle>
          {game.description ? (
            <p className="text-sm text-muted-foreground">{game.description}</p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-md border p-3">
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon name="wallet" size="xs" /> Entry cost
            </dt>
            <dd className="mt-1 text-sm font-semibold">{game.entryCost.toLocaleString()} pts</dd>
          </div>
          <div className="rounded-md border p-3">
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon name="gift" size="xs" /> Possible prize
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              Up to {game.maxReward.toLocaleString()} pts
            </dd>
          </div>
        </dl>

        <div className="mt-auto pt-1">
          <Button
            fullWidth
            isLoading={isPlaying}
            disabled={isPlaying}
            leftIcon={<Icon name="monitor" size="sm" />}
            onClick={handlePlay}
          >
            Play now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Member Games page — play a game, spend entry points and win reward points. */
export default function GamesPage() {
  const games = useGames();

  return (
    <>
      <Helmet>
        <title>Games</title>
      </Helmet>
      <PageHeader title="Games" description="Play for fun and win points." />

      {games.isPending ? (
        <LoadingScreen message="Loading games…" />
      ) : games.isError ? (
        <Alert variant="destructive" title="Could not load games">
          {games.error.message}
        </Alert>
      ) : games.data.length === 0 ? (
        <EmptyState
          icon={<Icon name="monitor" />}
          title="No games available"
          description="Check back soon — new games are added regularly."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.data.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </>
  );
}
