import { useEffect, useState } from "react";
import { CameraWidget } from "./components/CameraWidget";
import { MobileSender } from "./components/MobileSender";

export default function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route.startsWith("#/send") ? <MobileSender /> : <CameraWidget />;
}
