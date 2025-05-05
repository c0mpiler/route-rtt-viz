/**
 * App Reducer - State management for the main App component
 * 
 * This module provides a reducer for managing the App component's state,
 * with actions for tab navigation, loading states, etc.
 */
import { TabType } from '../components/layout/TabNavigation';

/**
 * App state interface
 */
export interface AppState {
  /** Currently active tab */
  activeTab: TabType;
  
  /** Whether initial data loading is complete */
  initialLoadComplete: boolean;
  
  /** Whether debugging tools are visible (dev only) */
  showDebuggingTools: boolean;
  
  /** Whether cache statistics are visible (dev only) */
  showCacheStats: boolean;
}

/**
 * Available action types
 */
export type AppAction = 
  | { type: 'SET_ACTIVE_TAB'; payload: TabType }
  | { type: 'SET_INITIAL_LOAD_COMPLETE'; payload: boolean }
  | { type: 'TOGGLE_DEBUGGING_TOOLS' }
  | { type: 'TOGGLE_CACHE_STATS' }
  | { type: 'RESET_DEBUG_TOOLS' };

/**
 * Initial state
 */
export const initialState: AppState = {
  activeTab: 'dashboard', // Set the default tab to the Dashboard view
  initialLoadComplete: false,
  showDebuggingTools: false,
  showCacheStats: false
};

/**
 * Reducer function for App state
 * 
 * @param state - Current state
 * @param action - Action to perform
 * @returns New state
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { 
        ...state, 
        activeTab: action.payload 
      };
      
    case 'SET_INITIAL_LOAD_COMPLETE':
      return { 
        ...state, 
        initialLoadComplete: action.payload 
      };
      
    case 'TOGGLE_DEBUGGING_TOOLS':
      // Reset cache stats when hiding debugging tools
      return { 
        ...state, 
        showDebuggingTools: !state.showDebuggingTools,
        showCacheStats: state.showDebuggingTools ? false : state.showCacheStats
      };
      
    case 'TOGGLE_CACHE_STATS':
      return { 
        ...state, 
        showCacheStats: !state.showCacheStats 
      };
      
    case 'RESET_DEBUG_TOOLS':
      return {
        ...state,
        showDebuggingTools: false,
        showCacheStats: false
      };
      
    default:
      return state;
  }
}
