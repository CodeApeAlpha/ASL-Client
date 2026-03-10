import React from "react";

import Receptive from "./components/Receptive";
import Expressive from "./components/Expressive";

export default function Translate() {
  return (
    <div className="flex h-screen w-screen items-center bg-neutral-950 px-4">
      <div className="grid w-full grid-cols-2 items-center justify-center border border-neutral-800 bg-neutral-900">
        <Receptive />
        <Expressive />
      </div>
    </div>
  );
}
