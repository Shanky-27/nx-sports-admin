
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Package, Pencil, Trash2, X, Upload,
  Star, Image as ImageIcon, RefreshCw, CheckCircle2,
  AlertCircle, Minus, Save
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  brand: string | null;
  price: number;
  original_price: number | null;
  description: string | null;
  sizes: string[];
  stock_by_size: Record<string, number>;
  image: string | null;
  images: string[] | null;
  status: string;
  featured: boolean;
  created_at: string;
};

type SizeRow = {
  size: string;
  stock: number;
};

const emptyForm = {
  name: "",
  brand: "NX Sports Gear",
  price: "",
  original_price: "",
  description: "",
  status: "active",
  featured: false,
};

export default function ProductsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [sizeRows, setSizeRows] = useState<SizeRow[]>([
    { size: "6", stock: 0 },
    { size: "7", stock: 0 },
    { size: "8", stock: 0 },
  ]);

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setProducts([]);
    } else {
      setProducts((data || []) as Product[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.replace("/login");
        return;
      }

      const { data, error: accessError } = await supabase.rpc(
        "is_product_admin"
      );

      if (!mounted) return;

      if (accessError || data !== true) {
        setError(
          "Access denied. Product management is available to active owner accounts only."
        );
        setCheckingAuth(false);
        setLoading(false);
        return;
      }

      setIsOwner(true);
      setCheckingAuth(false);
      await loadProducts();
    };

    checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) window.location.replace("/login");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const term = search.toLowerCase();

      const matchesSearch =
        product.name.toLowerCase().includes(term) ||
        (product.brand || "").toLowerCase().includes(term) ||
        String(product.id).includes(term);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && product.status === "active") ||
        (filter === "inactive" && product.status !== "active") ||
        (filter === "featured" && product.featured);

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const resetForm = () => {
    setForm(emptyForm);
    setSizeRows([
      { size: "6", stock: 0 },
      { size: "7", stock: 0 },
      { size: "8", stock: 0 },
    ]);
    setExistingImages([]);
    setNewFiles([]);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setError("");
    setMessage("");
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);

    setForm({
      name: product.name || "",
      brand: product.brand || "NX Sports Gear",
      price: String(product.price ?? ""),
      original_price:
        product.original_price == null
          ? ""
          : String(product.original_price),
      description: product.description || "",
      status: product.status || "active",
      featured: Boolean(product.featured),
    });

    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const stock = product.stock_by_size || {};

    setSizeRows(
      sizes.map((size) => ({
        size: String(size),
        stock: Number(stock[String(size)] || 0),
      }))
    );

    setExistingImages(
      Array.isArray(product.images) && product.images.length
        ? product.images
        : product.image
          ? [product.image]
          : []
    );

    setNewFiles([]);
    setError("");
    setMessage("");
    setModalOpen(true);
  };

  const addSize = () => {
    setSizeRows((current) => [...current, { size: "", stock: 0 }]);
  };

  const updateSize = (
    index: number,
    field: keyof SizeRow,
    value: string | number
  ) => {
    setSizeRows((current) =>
      current.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const removeSize = (index: number) => {
    setSizeRows((current) => current.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of newFiles) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
      const filePath = `products/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("product")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("product")
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Please enter a product name.");
      return;
    }

    if (form.price === "" || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      setError("Please enter a valid selling price.");
      return;
    }

    if (
      form.original_price !== "" &&
      (!Number.isFinite(Number(form.original_price)) ||
        Number(form.original_price) < 0)
    ) {
      setError("Please enter a valid original price.");
      return;
    }

    const validRows = sizeRows.filter((row) => row.size.trim() !== "");
    const uniqueSizes = new Set(validRows.map((row) => row.size.trim()));

    if (uniqueSizes.size !== validRows.length) {
      setError("Each size must be unique.");
      return;
    }

    if (validRows.some((row) => !Number.isInteger(Number(row.stock)) || Number(row.stock) < 0)) {
      setError("Stock must be a whole number and cannot be negative.");
      return;
    }

    setSaving(true);

    try {
      const uploadedUrls = await uploadImages();
      const allImages = [...existingImages, ...uploadedUrls];

      const sizes = validRows.map((row) => row.size.trim());
      const stockBySize = Object.fromEntries(
        validRows.map((row) => [
          row.size.trim(),
          Number(row.stock),
        ])
      );

      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || "NX Sports Gear",
        price: Number(form.price),
        original_price:
          form.original_price === ""
            ? null
            : Number(form.original_price),
        description: form.description.trim() || null,
        sizes,
        stock_by_size: stockBySize,
        image: allImages[0] || null,
        images: allImages,
        status: form.status,
        featured: form.featured,
        updated_at: new Date().toISOString(),
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId);

        if (updateError) throw updateError;

        setMessage("Product updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("products")
          .insert(payload);

        if (insertError) throw insertError;

        setMessage("Product added successfully.");
      }

      setModalOpen(false);
      resetForm();
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}" (ID: ${product.id})? This will remove the product record, but will not delete its Storage images.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage(`${product.name} deleted successfully.`);
    await loadProducts();
  };

  const toggleFeatured = async (product: Product) => {
    const { error: updateError } = await supabase
      .from("products")
      .update({
        featured: !product.featured,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadProducts();
  };

  const totalStock = (product: Product) =>
    Object.values(product.stock_by_size || {}).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );

  if (checkingAuth) {
    return (
      <main className="loading-state">
        <div className="flex flex-col items-center gap-4">
          <div className="loading-spinner" />
          VERIFYING ADMIN ACCESS...
        </div>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="loading-state">
        <div className="admin-card max-w-lg p-8 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-400" />
          <h1 className="admin-card-title">Access Restricted</h1>
          <p className="admin-card-description mt-2">
            {error || "Only active owner accounts can manage products."}
          </p>
          <a href="/dashboard" className="btn-secondary mt-5 inline-flex">
            Back to Dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell products-page">
      <div className="admin-layout">
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="admin-main">
          <AdminHeader
            title="PRODUCT MANAGEMENT"
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="admin-content">
            <section className="admin-page-header">
              <div>
                <div className="eyebrow">NX SPORTS / INVENTORY CONTROL</div>
                <h1 className="admin-page-title mt-2">Products</h1>
                <p className="admin-page-subtitle">
                  Add, edit and manage your store inventory
                </p>
              </div>

              <button
                type="button"
                onClick={openAddModal}
                className="btn-primary"
              >
                <Plus size={17} /> Add Product
              </button>
            </section>

            {message && (
              <div className="mb-4 flex items-center gap-2 rounded border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                <CheckCircle2 size={17} /> {message}
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle size={17} /> {error}
              </div>
            )}

            <section className="stats-grid mb-6">
              <div className="admin-card p-5">
                <div className="flex items-center gap-3">
                  <div className="stat-card-icon"><Package size={19} /></div>
                  <div>
                    <div className="text-xs text-[var(--c-text2)]">Total Products</div>
                    <div className="stat-card-value">{products.length}</div>
                  </div>
                </div>
              </div>

              <div className="admin-card p-5">
                <div className="flex items-center gap-3">
                  <div className="stat-card-icon"><CheckCircle2 size={19} /></div>
                  <div>
                    <div className="text-xs text-[var(--c-text2)]">Active</div>
                    <div className="stat-card-value">
                      {products.filter((p) => p.status === "active").length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-card p-5">
                <div className="flex items-center gap-3">
                  <div className="stat-card-icon"><Star size={19} /></div>
                  <div>
                    <div className="text-xs text-[var(--c-text2)]">Featured</div>
                    <div className="stat-card-value">
                      {products.filter((p) => p.featured).length}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card-header flex-wrap">
                <div>
                  <h2 className="admin-card-title">Product Inventory</h2>
                  <p className="admin-card-description">
                    {filteredProducts.length} products found
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadProducts}
                  className="btn-secondary"
                  disabled={loading}
                >
                  <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              <div className="flex flex-col gap-3 border-b border-[var(--c-border)] p-5 md:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search product name, brand or ID..."
                    className="admin-input w-full pl-10"
                  />
                </div>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="admin-input md:w-48"
                >
                  <option value="all">All Products</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="featured">Featured</option>
                </select>
              </div>

              {loading ? (
                <div className="p-12 text-center text-sm text-[var(--c-text2)]">
                  <div className="loading-spinner mx-auto mb-3" />
                  Loading products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center">
                  <Package size={35} className="mx-auto mb-3 text-[var(--c-text3)]" />
                  <h3 className="font-semibold">No products found</h3>
                  <p className="mt-1 text-sm text-[var(--c-text2)]">
                    Add a product or change your search filters.
                  </p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="admin-table min-w-[850px]">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Sizes / Stock</th>
                        <th>Status</th>
                        <th>Featured</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded border border-[var(--c-border)] bg-[var(--c-surface2)]">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <ImageIcon size={20} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[var(--c-chrome)]">
                                  {product.name}
                                </div>
                                <div className="text-xs text-[var(--c-text2)]">
                                  {product.brand} · ID #{product.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="font-semibold">
                              ₹{Number(product.price).toLocaleString("en-IN")}
                            </div>
                            {product.original_price != null && (
                              <div className="text-xs text-[var(--c-text3)] line-through">
                                ₹{Number(product.original_price).toLocaleString("en-IN")}
                              </div>
                            )}
                          </td>

                          <td>
                            <div className="text-xs text-[var(--c-text2)]">
                              {(product.sizes || []).join(", ") || "No sizes"}
                            </div>
                            <div className="mt-1 text-xs font-semibold">
                              {totalStock(product)} units
                            </div>
                          </td>

                          <td>
                            <span className={`badge ${product.status === "active" ? "badge-green" : "badge-gold"}`}>
                              {product.status}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              onClick={() => toggleFeatured(product)}
                              className={`rounded p-2 ${product.featured ? "text-yellow-400" : "text-[var(--c-text3)]"}`}
                              title="Toggle featured"
                            >
                              <Star size={18} fill={product.featured ? "currentColor" : "none"} />
                            </button>
                          </td>

                          <td>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(product)}
                                className="btn-icon"
                                title="Edit product"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteProduct(product)}
                                className="btn-icon text-red-400"
                                title="Delete product"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {modalOpen && (
        <div className="products-modal-overlay fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm md:p-8">
          <div className="my-auto w-full max-w-3xl rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] p-5">
              <div>
                <div className="eyebrow">NX SPORTS / INVENTORY</div>
                <h2 className="mt-1 text-xl font-bold">
                  {editingId !== null ? "Edit Product" : "Add New Product"}
                </h2>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveProduct} className="space-y-5 p-5">
              {error && (
                <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-[var(--c-text2)]">Product Name *</span>
                  <input
                    required
                    className="admin-input w-full"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. NX HYPERNOVA"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-2 block text-[var(--c-text2)]">Brand</span>
                  <input
                    className="admin-input w-full"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-2 block text-[var(--c-text2)]">Selling Price (₹) *</span>
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    className="admin-input w-full"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-2 block text-[var(--c-text2)]">Original Price / MRP (₹)</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    className="admin-input w-full"
                    value={form.original_price}
                    onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-2 block text-[var(--c-text2)]">Description</span>
                <textarea
                  rows={4}
                  className="admin-input w-full"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the product..."
                />
              </label>

              <div className="rounded border border-[var(--c-border)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Size-wise Inventory</h3>
                    <p className="text-xs text-[var(--c-text2)]">
                      Enter available sizes and stock quantities
                    </p>
                  </div>
                  <button type="button" onClick={addSize} className="btn-secondary">
                    <Plus size={15} /> Add Size
                  </button>
                </div>

                <div className="space-y-2">
                  {sizeRows.map((row, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_40px] gap-2">
                      <input
                        className="admin-input w-full"
                        value={row.size}
                        onChange={(e) => updateSize(index, "size", e.target.value)}
                        placeholder="Size (e.g. 7.5)"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="admin-input w-full"
                        value={row.stock}
                        onChange={(e) => updateSize(index, "stock", Number(e.target.value))}
                        placeholder="Stock"
                      />
                      <button
                        type="button"
                        onClick={() => removeSize(index)}
                        className="btn-icon text-red-400"
                        title="Remove size"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border border-[var(--c-border)] p-4">
                <h3 className="mb-1 font-semibold">Product Images</h3>
                <p className="mb-3 text-xs text-[var(--c-text2)]">
                  Upload multiple images. The first image will be the main product image.
                </p>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded border border-dashed border-[var(--c-border-hi)] bg-[var(--c-surface2)] p-6 text-center hover:border-blue-400">
                  <Upload size={23} className="mb-2 text-blue-400" />
                  <span className="text-sm font-semibold">Choose product images</span>
                  <span className="mt-1 text-xs text-[var(--c-text3)]">
                    JPG, PNG or WEBP
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setNewFiles((current) => [...current, ...files]);
                      e.target.value = "";
                    }}
                  />
                </label>

                {(existingImages.length > 0 || newFiles.length > 0) && (
                  <div className="mt-4 space-y-2">
                    {existingImages.map((url, index) => (
                      <div key={url} className="flex items-center gap-3 rounded bg-[var(--c-surface2)] p-2">
                        <img src={url} alt="" className="h-12 w-12 rounded object-cover" />
                        <span className="min-w-0 flex-1 truncate text-xs">
                          {index === 0 ? "Main image" : `Gallery image ${index + 1}`}
                        </span>
                        {index > 0 && (
                          <button
                            type="button"
                            className="text-xs text-blue-400"
                            onClick={() => {
                              setExistingImages((current) => {
                                const next = [...current];
                                const [selected] = next.splice(index, 1);
                                next.unshift(selected);
                                return next;
                              });
                            }}
                          >
                            Make main
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-icon text-red-400"
                          onClick={() => setExistingImages((current) => current.filter((_, i) => i !== index))}
                          title="Remove image from product"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}

                    {newFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded bg-[var(--c-surface2)] p-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-[var(--c-surface)]">
                          <ImageIcon size={19} />
                        </div>
                        <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>
                        <button
                          type="button"
                          className="btn-icon text-red-400"
                          onClick={() => setNewFiles((current) => current.filter((_, i) => i !== index))}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-[var(--c-text2)]">Product Status</span>
                  <select
                    className="admin-input w-full"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded border border-[var(--c-border)] p-3">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold">Featured Product</span>
                    <span className="text-xs text-[var(--c-text2)]">Highlight this product</span>
                  </span>
                  <Star size={18} className="ml-auto text-yellow-400" />
                </label>
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-[var(--c-border)] pt-5 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <><RefreshCw size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={16} /> {editingId !== null ? "Update Product" : "Save Product"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
