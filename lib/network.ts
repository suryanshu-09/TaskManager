import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkState {
  status: NetworkStatus;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

type NetworkStatusListener = (state: NetworkState) => void;

let currentState: NetworkState = {
  status: 'unknown',
  isConnected: false,
  isInternetReachable: null,
  type: null,
};

let subscription: NetInfoSubscription | null = null;
const listeners: Set<NetworkStatusListener> = new Set();

function parseNetInfoState(state: NetInfoState): NetworkState {
  const isConnected = state.isConnected ?? false;
  const isInternetReachable = state.isInternetReachable;

  let status: NetworkStatus = 'unknown';
  if (isConnected) {
    if (isInternetReachable === false) {
      status = 'offline';
    } else if (isInternetReachable === true) {
      status = 'online';
    } else {
      status = 'online';
    }
  } else {
    status = 'offline';
  }

  return {
    status,
    isConnected,
    isInternetReachable,
    type: state.type,
  };
}

function notifyListeners(state: NetworkState): void {
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error('Error in network status listener:', error);
    }
  });
}

function handleNetworkChange(state: NetInfoState): void {
  const newState = parseNetInfoState(state);
  const wasOnline = currentState.status === 'online';
  const isNowOnline = newState.status === 'online';

  currentState = newState;

  if (wasOnline !== isNowOnline) {
    console.log(
      `Network status changed: ${wasOnline ? 'online' : 'offline'} -> ${isNowOnline ? 'online' : 'offline'}`
    );
  }

  notifyListeners(newState);
}

export async function initializeNetworkMonitoring(): Promise<NetworkState> {
  const initialState = await NetInfo.fetch();
  currentState = parseNetInfoState(initialState);

  if (subscription) {
    subscription();
  }
  subscription = NetInfo.addEventListener(handleNetworkChange);

  console.log(`Network monitoring initialized. Current status: ${currentState.status}`);
  return currentState;
}

export function stopNetworkMonitoring(): void {
  if (subscription) {
    subscription();
    subscription = null;
  }
  listeners.clear();
}

export function getNetworkState(): NetworkState {
  return { ...currentState };
}

export function isOnline(): boolean {
  return currentState.status === 'online';
}

export function isOffline(): boolean {
  return currentState.status === 'offline';
}

export function addNetworkListener(listener: NetworkStatusListener): () => void {
  listeners.add(listener);

  try {
    listener(currentState);
  } catch (error) {
    console.error('Error calling network listener with initial state:', error);
  }

  return () => {
    listeners.delete(listener);
  };
}

export async function refreshNetworkState(): Promise<NetworkState> {
  const state = await NetInfo.fetch();
  const newState = parseNetInfoState(state);
  currentState = newState;
  notifyListeners(newState);
  return newState;
}

export function waitForOnline(timeoutMs?: number): Promise<boolean> {
  const defaultTimeout = parseInt(process.env.NETWORK_TIMEOUT_MS || '30000');
  const actualTimeout = timeoutMs || defaultTimeout;

  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const unsubscribe = addNetworkListener((state) => {
      if (state.status === 'online' && !resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(true);
      }
    });

    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve(false);
      }
    }, actualTimeout);
  });
}
