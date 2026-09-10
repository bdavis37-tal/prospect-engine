import "./styles/globals.css";
import { ErrorBoundary } from "react-error-boundary";
import Workbench from "./workbench/Workbench";
export default function App() {
  return <ErrorBoundary fallback={<main style={{padding:32,background:"white",color:"#172b45"}}><h1>The workspace could not be displayed</h1><p>Your saved portfolios are preserved. Reload to recover your browser draft.</p><button onClick={()=>location.reload()}>Reload workspace</button></main>}><Workbench /></ErrorBoundary>;
}
