import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar';
import CategoryNav from '../components/layout/CategoryNav';
import Footer from '../components/layout/Footer';
import { fetchCategories } from '../services/productService';

const MainLayout = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories()
      .then((res) => setCategories(res.data.categories.filter((c) => c.isActive)))
      .catch(() => setCategories([]));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />
      <CategoryNav categories={categories} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
