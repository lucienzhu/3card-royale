// One rules / feature implementation for browser play and local evaluation.
import * as coreModule from '../gamecore.js';
import * as sdkModule from '../sdk/index.js';
import * as featuresModule from '../sdk/features.js';
import * as codeModule from '../sdk/policy.js';
import * as easyModule from '../sdk/easy-policy.js';
export const core = coreModule.default || globalThis.GK;
export const sdk = sdkModule.default || globalThis.ThreeCardRoyale;
export const features = featuresModule.default || globalThis.RoyaleFeatures;
export const code = codeModule.default || globalThis.RoyaleCodePolicy;
export const easy = easyModule.default || globalThis.RoyaleEasyPolicy;
