import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { StoreLayout } from './components/store/StoreLayout';
import { HomePage } from './pages/store/HomePage';
import { CatalogPage } from './pages/store/CatalogPage';
import { ProductDetailPage } from './pages/store/ProductDetailPage';
import { CartPage } from './pages/store/CartPage';
import { CheckoutPage } from './pages/store/CheckoutPage';
import { TrackOrderPage } from './pages/store/TrackOrderPage';
import {
  BlogPage,
  ArticleDetailPage,
  FaqPage,
  AboutPage,
  ContactPage,
  PoliciesPage,
} from './pages/store/ContentPages';

import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { PageBuilderPage } from './pages/admin/PageBuilderPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { OrdersPage } from './pages/admin/OrdersPage';
import { MarketingCmsPage } from './pages/admin/MarketingCmsPage';
import { MediaLibraryPage } from './pages/admin/MediaLibraryPage';
import { SettingsPage } from './pages/admin/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          {/* Customer Storefront Routes */}
          <Route path="/" element={<StoreLayout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<CatalogPage />} />
            <Route path="collections/:slug" element={<CatalogPage />} />
            <Route path="product/:slug" element={<ProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="track-order" element={<TrackOrderPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/:slug" element={<ArticleDetailPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="policies" element={<PoliciesPage />} />
          </Route>

          {/* Merchant Admin Console Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="builder" element={<PageBuilderPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="marketing" element={<MarketingCmsPage />} />
            <Route path="media" element={<MediaLibraryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
