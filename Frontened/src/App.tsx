import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./Components/Layout/Layout";

const Home = lazy(() => import("./Pages/Home"));

function App() {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>

       <Route element={<Layout/>}>
          <Route index element={<Home />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
