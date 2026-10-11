import { useRegisterSW } from 'virtual:pwa-register/react';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { Component, type ErrorInfo, lazy, type ReactNode, Suspense, useEffect } from 'react';
import { ItemSheet } from './components/ItemSheet';
import { Lefty } from './components/Lefty';
import { Shell } from './components/Shell';
import { ToastProvider, useToast } from './components/Toasts';
import { Button } from './components/ui';
import { hrefFor, useRoute } from './lib/hooks';
import { applyTheme, useSettings } from './lib/settings';
import { Home } from './pages/Home';

// Home loads first; everything else arrives when you open it.
const Stuff = lazy(() => import('./pages/Stuff').then((mod) => ({ default: mod.Stuff })));
const Shame = lazy(() => import('./pages/Shame').then((mod) => ({ default: mod.Shame })));
const Report = lazy(() => import('./pages/Report').then((mod) => ({ default: mod.Report })));
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((mod) => ({ default: mod.SettingsPage })),
);

function Loading() {
  return (
    <div className="grid place-items-center py-24" role="status">
      <Lefty mood="thinking" size={80} title="Loading" />
    </div>
  );
}

const TITLES = {
  home: "Dude, Where's My Stuff?",
  stuff: "My stuff · Dude, Where's My Stuff?",
  shame: "Hall of Shame · Dude, Where's My Stuff?",
  report: "Chaos Report · Dude, Where's My Stuff?",
  settings: "Settings · Dude, Where's My Stuff?",
  notFound: "Lost · Dude, Where's My Stuff?",
};

function NotFound() {
  return (
    <section className="sticker mx-auto mt-6 flex max-w-lg flex-col items-center gap-4 bg-surface p-8 text-center">
      <Lefty mood="sad" size={100} />
      <h1 className="text-4xl font-extrabold uppercase">404</h1>
      <p className="font-marker text-xl">This page is also lost. Should&apos;ve stashed it.</p>
      <a
        href={hrefFor('home')}
        className="sticker-sm press inline-flex min-h-11 items-center bg-yellow px-4 font-extrabold text-on-accent"
      >
        Take me home
      </a>
    </section>
  );
}

function UpdatePrompt() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    toast({
      message: 'A fresh version of Lefty is ready ✨',
      action: { label: 'Refresh', onClick: () => void updateServiceWorker(true) },
      duration: 0,
    });
  }, [needRefresh, toast, updateServiceWorker]);

  useEffect(() => {
    if (offlineReady)
      toast({
        message: 'Ready to work offline. Even in the basement. 🔌',
        tone: 'lime',
        duration: 4000,
      });
  }, [offlineReady, toast]);

  return null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="sticker mx-auto mt-16 flex max-w-lg flex-col items-center gap-4 bg-surface p-8 text-center">
        <Lefty mood="shocked" size={100} />
        <h1 className="text-3xl font-extrabold uppercase">Something broke</h1>
        <p className="font-marker text-xl">
          Even I lose things sometimes. Your stuff is safe; reloading usually helps.
        </p>
        <Button tone="yellow" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </section>
    );
  }
}

export function App() {
  const route = useRoute();
  const { theme } = useSettings();

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    document.title = TITLES[route];
  }, [route]);

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <ErrorBoundary>
            <Shell route={route}>
              <Suspense fallback={<Loading />}>
                {route === 'home' && <Home />}
                {route === 'stuff' && <Stuff />}
                {route === 'shame' && <Shame />}
                {route === 'report' && <Report />}
                {route === 'settings' && <SettingsPage />}
                {route === 'notFound' && <NotFound />}
              </Suspense>
            </Shell>
            <ItemSheet />
          </ErrorBoundary>
          <UpdatePrompt />
        </ToastProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
