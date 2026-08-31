import { 
  AppInstanceRecord, 
  getAppInstances, 
  deployAppInstance, 
  deriveInstanceSlug, 
  deriveSeedNode 
} from './identityStore';
import { getModuleEndpoint, buildAppLaunchUrl, launchExternalApp, AppLaunchPayload } from '../utils/envResolver';

export interface AppSubscriptionState {
  moduleKey: string;
  isInstalled: boolean;
  instanceName: string;
  legalName: string;
  did: string;
  token: string;
  trialExpiresAt: number;
  status: 'active' | 'inactive';
}

export {
  getAppInstances,
  deployAppInstance,
  deriveInstanceSlug,
  deriveSeedNode,
  getModuleEndpoint,
  buildAppLaunchUrl,
  launchExternalApp
};
export type { AppInstanceRecord, AppLaunchPayload };
