// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import {mount} from 'svelte';
import App from './App.svelte';
import {installFatalErrorSurface} from './FatalErrorSurface';
import './Styles.css';

installFatalErrorSurface();

const target = document.getElementById('root');

if (!target) {
  throw new Error('Arudio root element was not found.');
}

const app = mount(App, {target});

export default app;
