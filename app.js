import { LocalWorkspaceRepository } from "./src/infrastructure/local-workspace-repository.js";
import { DemoAuthService } from "./src/infrastructure/demo-auth-service.js";
import { AppController } from "./src/ui/app-controller.js";

const app = new AppController({
  repository: new LocalWorkspaceRepository(window.localStorage),
  auth: new DemoAuthService(window.sessionStorage),
});

app.start().catch((error) => {
  console.error("Orbit failed to start", error);
  document.body.innerHTML = '<main class="fatal-error"><h1>Orbit could not start</h1><p>Refresh the page to try again.</p></main>';
});
