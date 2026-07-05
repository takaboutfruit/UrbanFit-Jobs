/**
 * Root application component.
 *
 * Wraps the app routes in a client-side <BrowserRouter>. The route config
 * (AppShell layout route + the four screen routes, with "/" redirecting to
 * "/jobs") lives in ./shell/routes. The AppShell renders the "UrbanFit Jobs"
 * product name and the responsive navigation chrome (Req 2.1–2.6).
 */
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./shell";

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
