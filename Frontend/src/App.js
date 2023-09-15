import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Courses from "./pages/Courses";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Layout from "./pages/Layout";
import CourseForm from "./pages/FormTable";
import CourseDescription from "./pages/Description";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="courses" element={<Courses />} />
          <Route path="About" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="addcourse" element={<CourseForm />} />
          <Route path="coursedescription" element={<CourseDescription />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
