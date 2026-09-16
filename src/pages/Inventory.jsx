import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";
import { canSeeInventoryCost } from "../utils/permissions";

/* =========================================================
   CHINESE TRANSLATIONS
========================================================= */

const categoryChinese = {
  "PPF": "漆面保护膜",
  "Window Film": "车窗膜",
  "Ceramic Coating": "陶瓷涂层",
  "Accessories": "配件",
  "Maintenance": "保养",
  "Parts": "零部件",
  "Other": "其他",
};

const productChinese = {
  "Paint Protection Film": "漆面保护膜",
  "Full Body PPF": "全车漆面保护膜",
  "Front PPF": "前部漆面保护膜",
  "Matte PPF": "哑光漆面保护膜",
  "Glossy PPF": "高光漆面保护膜",
  "Window Film": "车窗膜",
  "Ceramic Coating": "陶瓷涂层",
  "Car Wash": "洗车",
  "Oil Change": "换机油",
  "Engine Oil": "发动机机油",
  "Brake Pads": "刹车片",
  "Air Filter": "空气滤芯",
  "Cabin Filter": "空调滤芯",
  "Wiper": "雨刷",
  "Car Accessories": "汽车配件",
};

/* =========================================================
   HELPERS
========================================================= */

function getProductDisplay(name) {
  const chinese = productChinese[name];

  if (chinese) {
    return (
      <div>
        <div style={{ fontWeight: 700 }}>{name}</div>
        <div style={{ color: "#9ca3af", fontSize: 12 }}>{chinese}</div>
      </div>
    );
  }

  return name;
}

function getCategoryDisplay(name) {
  const chinese = categoryChinese[name];

  if (chinese) {
    return (
      <div>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div style={{ color: "#9ca3af", fontSize: 11 }}>{chinese}</div>
      </div>
    );
  }

  return name;
}

function getStatus(product) {
  const stock = Number(product.current_stock || 0);
  const minimum = Number(product.minimum_stock || 0);

  if (stock <= 0) {
    return {
      label: "Out of Stock",
      chinese: "缺货",
      color: "#ef4444",
      background: "rgba(239,68,68,0.12)",
    };
  }

  if (stock <= minimum) {
    return {
      label: "Low Stock",
      chinese: "库存不足",
      color: "#f59e0b",
      background: "rgba(245,158,11,0.12)",
    };
  }

  return {
    label: "In Stock",
    chinese: "有库存",
    color: "#22c55e",
    background: "rgba(34,197,94,0.12)",
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Inventory() {
  const loggedInUser = JSON.parse(
    localStorage.getItem("loggedInUser") ||
      localStorage.getItem("user") ||
      "null"
  );

  const showCost = canSeeInventoryCost(loggedInUser);
  const isAdmin =
    loggedInUser?.role === "admin" ||
    loggedInUser?.role === "Admin" ||
    loggedInUser?.is_admin === true;

  const shopId = loggedInUser?.shop_id;

  /* =========================================================
     STATE
  ========================================================= */

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showProductForm, setShowProductForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [movementType, setMovementType] = useState("in");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [categoryName, setCategoryName] = useState("");

  /* =========================================================
     IMAGE STATE
  ========================================================= */

  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  /* =========================================================
     PRODUCT FORM
  ========================================================= */

  const emptyProductForm = {
    sku: "",
    name: "",
    category_id: "",
    unit: "pcs",
    cost_price: "",
    current_stock: "0",
    minimum_stock: "0",
    description: "",
    image_url: "",
  };

  const [productForm, setProductForm] = useState(emptyProductForm);

  /* =========================================================
     MOVEMENT FORM
  ========================================================= */

  const [movementForm, setMovementForm] = useState({
    quantity: "",
    unit_cost: "",
    reference: "",
    notes: "",
  });

  /* =========================================================
     CLEAN UP IMAGE PREVIEW
  ========================================================= */

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [shopId]);

  async function loadProducts() {
    if (!shopId) {
      setLoading(false);
      setError("No shop is assigned to this user.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data, error: productsError } = await supabase
        .from("inventory_products")
        .select(
          `
          id,
          sku,
          name,
          category_id,
          supplier_id,
          description,
          unit,
          cost_price,
          selling_price,
          current_stock,
          minimum_stock,
          active,
          created_at,
          updated_at,
          shop_id,
          image_url
        `
        )
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("name", { ascending: true });

      if (productsError) throw productsError;

      setProducts(data || []);
    } catch (err) {
      console.error("loadProducts error:", err);
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    if (!shopId) return;

    try {
      const { data, error: categoriesError } = await supabase
        .from("inventory_categories")
        .select(
          `
          id,
          name,
          description,
          active,
          shop_id
        `
        )
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("name", { ascending: true });

      if (categoriesError) throw categoriesError;

      setCategories(data || []);
    } catch (err) {
      console.error("loadCategories error:", err);
      setError(err.message || "Failed to load categories.");
    }
  }

  /* =========================================================
     FILTERED PRODUCTS
  ========================================================= */

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const category = categories.find(
        (item) => item.id === product.category_id
      );

      const categoryNameValue = category?.name || "";

      const matchesSearch =
        !query ||
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        categoryNameValue.toLowerCase().includes(query);

      const matchesCategory =
        !categoryFilter || product.category_id === categoryFilter;

      const status = getStatus(product);

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "in" && status.label === "In Stock") ||
        (statusFilter === "low" && status.label === "Low Stock") ||
        (statusFilter === "out" && status.label === "Out of Stock");

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [
    products,
    categories,
    search,
    categoryFilter,
    statusFilter,
  ]);

  /* =========================================================
     STATS
  ========================================================= */

  const stats = useMemo(() => {
    const totalProducts = products.length;

    const totalUnits = products.reduce(
      (sum, product) => sum + Number(product.current_stock || 0),
      0
    );

    const lowStock = products.filter((product) => {
      const stock = Number(product.current_stock || 0);
      const minimum = Number(product.minimum_stock || 0);

      return stock > 0 && stock <= minimum;
    }).length;

    const outOfStock = products.filter(
      (product) => Number(product.current_stock || 0) <= 0
    ).length;

    const inventoryValue = products.reduce((sum, product) => {
      return (
        sum +
        Number(product.current_stock || 0) *
          Number(product.cost_price || 0)
      );
    }, 0);

    return {
      totalProducts,
      totalUnits,
      lowStock,
      outOfStock,
      inventoryValue,
    };
  }, [products]);

  /* =========================================================
     ADD PRODUCT
  ========================================================= */

  function openAddProduct() {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductImage(null);
    setImagePreview("");
    setError("");
    setMessage("");
    setShowProductForm(true);
  }

  /* =========================================================
     EDIT PRODUCT
  ========================================================= */

  function openEditProduct(product) {
    setEditingProduct(product);

    setProductForm({
      sku: product.sku || "",
      name: product.name || "",
      category_id: product.category_id || "",
      unit: product.unit || "pcs",
      cost_price:
        product.cost_price !== null && product.cost_price !== undefined
          ? String(product.cost_price)
          : "",
      current_stock:
        product.current_stock !== null &&
        product.current_stock !== undefined
          ? String(product.current_stock)
          : "0",
      minimum_stock:
        product.minimum_stock !== null &&
        product.minimum_stock !== undefined
          ? String(product.minimum_stock)
          : "0",
      description: product.description || "",
      image_url: product.image_url || "",
    });

    setProductImage(null);
    setImagePreview(product.image_url || "");

    setError("");
    setMessage("");
    setShowProductForm(true);
  }

  /* =========================================================
     IMAGE CHANGE
  ========================================================= */

  function handleProductImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select an image file. / 请选择图片文件。"
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image must be smaller than 5 MB. / 图片必须小于 5 MB。"
      );
      return;
    }

    setError("");

    setProductImage(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  /* =========================================================
     REMOVE IMAGE
  ========================================================= */

  function removeProductImage() {
    setProductImage(null);
    setProductForm((prev) => ({
      ...prev,
      image_url: "",
    }));
    setImagePreview("");
  }

  /* =========================================================
     UPLOAD IMAGE
  ========================================================= */

  async function uploadProductImage(file, sku) {
    if (!file) {
      return productForm.image_url || null;
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeSku = String(sku)
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const fileName = `${safeSku}-${Date.now()}.${extension}`;

    const filePath = `${shopId}/${fileName}`;

    setUploadingImage(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from("inventory-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("inventory-images")
        .getPublicUrl(filePath);

      return data?.publicUrl || null;
    } finally {
      setUploadingImage(false);
    }
  }

  /* =========================================================
     SAVE PRODUCT
  ========================================================= */

  async function saveProduct(event) {
    event.preventDefault();

    if (!isAdmin) {
      setError(
        "Only administrators can add or edit inventory products."
      );
      return;
    }

    if (!shopId) {
      setError("No shop is assigned to this user.");
      return;
    }

    const sku = productForm.sku.trim();
    const name = productForm.name.trim();

    if (!sku) {
      setError("SKU is required.");
      return;
    }

    if (!name) {
      setError("Product name is required.");
      return;
    }

    const currentStock = Number(productForm.current_stock || 0);
    const minimumStock = Number(productForm.minimum_stock || 0);
    const costPrice = Number(productForm.cost_price || 0);

    if (currentStock < 0) {
      setError("Current stock cannot be negative.");
      return;
    }

    if (minimumStock < 0) {
      setError("Minimum stock cannot be negative.");
      return;
    }

    if (costPrice < 0) {
      setError("Cost price cannot be negative.");
      return;
    }

    const categoryId = productForm.category_id || null;

    if (categoryId) {
      const categoryExists = categories.some(
        (category) => category.id === categoryId
      );

      if (!categoryExists) {
        setError("Selected category is not valid.");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      /* ---------------------------------------------
         UPLOAD IMAGE FIRST
      --------------------------------------------- */

      let imageUrl = productForm.image_url || null;

      if (productImage) {
        imageUrl = await uploadProductImage(productImage, sku);
      }

      const productData = {
        sku,
        name,
        category_id: categoryId,
        unit: productForm.unit || "pcs",
        cost_price: costPrice,
        current_stock: currentStock,
        minimum_stock: minimumStock,
        description: productForm.description.trim() || null,
        image_url: imageUrl,
        shop_id: shopId,
        active: true,
        updated_at: new Date().toISOString(),
      };

      /* ---------------------------------------------
         UPDATE
      --------------------------------------------- */

      if (editingProduct) {
        const { error: updateError } = await supabase
          .from("inventory_products")
          .update(productData)
          .eq("id", editingProduct.id)
          .eq("shop_id", shopId);

        if (updateError) {
          throw updateError;
        }

        setMessage(
          "Product updated successfully. / 产品更新成功。"
        );
      }

      /* ---------------------------------------------
         INSERT
      --------------------------------------------- */

      else {
        const { error: insertError } = await supabase
          .from("inventory_products")
          .insert(productData);

        if (insertError) {
          throw insertError;
        }

        setMessage(
          "Product added successfully. / 产品添加成功。"
        );
      }

      await loadProducts();

      setShowProductForm(false);
      setProductImage(null);
      setImagePreview("");
      setProductForm(emptyProductForm);
      setEditingProduct(null);
    } catch (err) {
      console.error("saveProduct error:", err);

      setError(
        err.message ||
          "Failed to save product. / 保存产品失败。"
      );
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  /* =========================================================
     OPEN STOCK MOVEMENT
  ========================================================= */

  function openMovement(product, type) {
    setSelectedProduct(product);
    setMovementType(type);

    setMovementForm({
      quantity: "",
      unit_cost:
        product.cost_price !== null &&
        product.cost_price !== undefined
          ? String(product.cost_price)
          : "",
      reference: "",
      notes: "",
    });

    setError("");
    setMessage("");
    setShowMovementForm(true);
  }

  /* =========================================================
     SAVE STOCK MOVEMENT
  ========================================================= */

  async function saveMovement(event) {
    event.preventDefault();

    if (!isAdmin) {
      setError(
        "Only administrators can record inventory movements."
      );
      return;
    }

    if (!selectedProduct) {
      setError("No product selected.");
      return;
    }

    const quantity = Number(movementForm.quantity || 0);

    if (quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const { error: rpcError } = await supabase.rpc(
        "record_inventory_movement",
        {
          p_product_id: selectedProduct.id,
          p_movement_type: movementType,
          p_quantity: quantity,
          p_unit_cost: Number(movementForm.unit_cost || 0),
          p_reference:
            movementForm.reference.trim() || null,
          p_notes: movementForm.notes.trim() || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage(
        "Stock movement recorded successfully. / 库存变动记录成功。"
      );

      await loadProducts();

      setShowMovementForm(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error("saveMovement error:", err);

      setError(
        err.message ||
          "Failed to record stock movement."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     LOAD HISTORY
  ========================================================= */

  async function loadHistory(product) {
    if (!product) return;

    setSelectedProduct(product);
    setHistoryLoading(true);
    setError("");

    try {
      const { data, error: historyError } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false });

      if (historyError) {
        throw historyError;
      }

      setHistory(data || []);
    } catch (err) {
      console.error("loadHistory error:", err);
      setError(
        err.message ||
          "Failed to load inventory history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  /* =========================================================
     CATEGORY
  ========================================================= */

  async function saveCategory(event) {
    event.preventDefault();

    if (!isAdmin) {
      setError(
        "Only administrators can create categories."
      );
      return;
    }

    const name = categoryName.trim();

    if (!name) {
      setError("Category name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const { error: categoryError } = await supabase
        .from("inventory_categories")
        .insert({
          name,
          shop_id: shopId,
          active: true,
        });

      if (categoryError) {
        throw categoryError;
      }

      setMessage(
        "Category created successfully. / 分类创建成功。"
      );

      setCategoryName("");
      setShowCategoryForm(false);

      await loadCategories();
    } catch (err) {
      console.error("saveCategory error:", err);

      setError(
        err.message ||
          "Failed to create category."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  function formatDate(date) {
    if (!date) return "-";

    return new Date(date).toLocaleString();
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Inventory
          </h1>

          <div style={styles.subtitle}>
            库存管理
          </div>
        </div>

        <div style={styles.headerButtons}>
          {isAdmin && (
            <>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setCategoryName("");
                  setError("");
                  setShowCategoryForm(true);
                }}
              >
                + Category
              </button>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={openAddProduct}
              >
                + Add Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          MESSAGE / ERROR
      ===================================================== */}

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {message && (
        <div style={styles.messageBox}>
          {message}
        </div>
      )}

      {/* =====================================================
          STATS
      ===================================================== */}

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>
            Total Products
          </div>

          <div style={styles.statValue}>
            {stats.totalProducts}
          </div>

          <div style={styles.statChinese}>
            产品总数
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>
            Total Units
          </div>

          <div style={styles.statValue}>
            {stats.totalUnits}
          </div>

          <div style={styles.statChinese}>
            总库存数量
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>
            Low Stock
          </div>

          <div
            style={{
              ...styles.statValue,
              color: "#f59e0b",
            }}
          >
            {stats.lowStock}
          </div>

          <div style={styles.statChinese}>
            库存不足
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>
            Out of Stock
          </div>

          <div
            style={{
              ...styles.statValue,
              color: "#ef4444",
            }}
          >
            {stats.outOfStock}
          </div>

          <div style={styles.statChinese}>
            缺货
          </div>
        </div>

        {showCost && (
          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              Inventory Value
            </div>

            <div style={styles.statValue}>
              QAR{" "}
              {stats.inventoryValue.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </div>

            <div style={styles.statChinese}>
              库存价值
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search SKU, product, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value)
          }
          style={styles.select}
        >
          <option value="">
            All Categories / 所有分类
          </option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          style={styles.select}
        >
          <option value="">
            All Status / 所有状态
          </option>

          <option value="in">
            In Stock / 有库存
          </option>

          <option value="low">
            Low Stock / 库存不足
          </option>

          <option value="out">
            Out of Stock / 缺货
          </option>
        </select>
      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.emptyState}>
            Loading inventory...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={styles.emptyState}>
            No products found.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th
                  style={{
                    ...styles.th,
                    width: 75,
                  }}
                >
                  Photo
                </th>

                <th style={styles.th}>
                  SKU
                </th>

                <th style={styles.th}>
                  Product
                </th>

                <th style={styles.th}>
                  Category
                </th>

                <th style={styles.th}>
                  Stock
                </th>

                <th style={styles.th}>
                  Min.
                </th>

                {showCost && (
                  <th style={styles.th}>
                    Cost
                  </th>
                )}

                <th style={styles.th}>
                  Status
                </th>

                <th style={styles.th}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const category = categories.find(
                  (item) =>
                    item.id === product.category_id
                );

                const status = getStatus(product);

                return (
                  <tr key={product.id}>
                    {/* PHOTO */}

                    <td style={styles.td}>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          style={styles.tableImage}
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div style={styles.tableImagePlaceholder}>
                          📷
                        </div>
                      )}
                    </td>

                    {/* SKU */}

                    <td style={styles.td}>
                      <span style={styles.sku}>
                        {product.sku}
                      </span>
                    </td>

                    {/* PRODUCT */}

                    <td style={styles.td}>
                      {getProductDisplay(
                        product.name
                      )}
                    </td>

                    {/* CATEGORY */}

                    <td style={styles.td}>
                      {category
                        ? getCategoryDisplay(
                            category.name
                          )
                        : "-"}
                    </td>

                    {/* STOCK */}

                    <td
                      style={{
                        ...styles.td,
                        fontWeight: 700,
                      }}
                    >
                      {product.current_stock}{" "}
                      {product.unit || "pcs"}
                    </td>

                    {/* MINIMUM */}

                    <td style={styles.td}>
                      {product.minimum_stock}
                    </td>

                    {/* COST */}

                    {showCost && (
                      <td style={styles.td}>
                        QAR{" "}
                        {Number(
                          product.cost_price || 0
                        ).toFixed(2)}
                      </td>
                    )}

                    {/* STATUS */}

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          color: status.color,
                          background:
                            status.background,
                        }}
                      >
                        {status.label}

                        <small
                          style={{
                            display: "block",
                            marginTop: 2,
                            fontSize: 9,
                          }}
                        >
                          {status.chinese}
                        </small>
                      </span>
                    </td>

                    {/* ACTIONS */}

                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              style={styles.smallButton}
                              onClick={() =>
                                openMovement(
                                  product,
                                  "in"
                                )
                              }
                            >
                              + Stock
                            </button>

                            <button
                              type="button"
                              style={
                                styles.smallDangerButton
                              }
                              onClick={() =>
                                openMovement(
                                  product,
                                  "out"
                                )
                              }
                            >
                              - Stock
                            </button>

                            <button
                              type="button"
                              style={
                                styles.smallButton
                              }
                              onClick={() =>
                                openEditProduct(
                                  product
                                )
                              }
                            >
                              Edit
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          style={styles.smallDarkButton}
                          onClick={() =>
                            loadHistory(product)
                          }
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* =====================================================
          PRODUCT MODAL
      ===================================================== */}

      {showProductForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  {editingProduct
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <div style={styles.modalChinese}>
                  {editingProduct
                    ? "编辑产品"
                    : "添加产品"}
                </div>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={() =>
                  setShowProductForm(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct}>
              {/* =================================================
                  IMAGE UPLOAD
              ================================================= */}

              <div style={styles.imageUploadSection}>
                <div style={styles.imageUploadLabel}>
                  Product Photo / 产品图片
                </div>

                <div style={styles.imageUploadContent}>
                  {imagePreview ? (
                    <div style={styles.imagePreviewWrapper}>
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        style={styles.imagePreview}
                      />
                    </div>
                  ) : (
                    <div
                      style={
                        styles.largeImagePlaceholder
                      }
                    >
                      <div
                        style={
                          styles.placeholderIcon
                        }
                      >
                        📷
                      </div>

                      <div
                        style={
                          styles.imagePlaceholderText
                        }
                      >
                        No photo
                      </div>

                      <div
                        style={
                          styles.imagePlaceholderChinese
                        }
                      >
                        没有图片
                      </div>
                    </div>
                  )}

                  <div style={styles.imageButtons}>
                    <label
                      htmlFor="product-image"
                      style={
                        styles.chooseImageButton
                      }
                    >
                      {imagePreview
                        ? "Change Photo"
                        : "Choose Photo"}
                    </label>

                    <input
                      id="product-image"
                      type="file"
                      accept="image/*"
                      onChange={
                        handleProductImageChange
                      }
                      style={{
                        display: "none",
                      }}
                    />

                    {imagePreview && (
                      <button
                        type="button"
                        style={
                          styles.removeImageButton
                        }
                        onClick={
                          removeProductImage
                        }
                      >
                        Remove
                      </button>
                    )}

                    <div
                      style={
                        styles.imageHelpText
                      }
                    >
                      JPG, PNG or WebP • Max 5 MB
                    </div>
                  </div>
                </div>
              </div>

              {/* =================================================
                  FORM GRID
              ================================================= */}

              <div style={styles.formGrid}>
                {/* SKU */}

                <div style={styles.field}>
                  <label style={styles.label}>
                    SKU *
                  </label>

                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        sku: e.target.value,
                      })
                    }
                    style={styles.input}
                    placeholder="e.g. PPF-001"
                  />
                </div>

                {/* PRODUCT NAME */}

                <div style={styles.field}>
                  <label style={styles.label}>
                    Product Name *
                  </label>

                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        name: e.target.value,
                      })
                    }
                    style={styles.input}
                    placeholder="Product name"
                  />
                </div>

                {/* CATEGORY */}

                <div style={styles.field}>
                  <label style={styles.label}>
                    Category
                  </label>

                  <select
                    value={
                      productForm.category_id
                    }
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        category_id:
                          e.target.value,
                      })
                    }
                    style={styles.input}
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* UNIT */}

                <div style={styles.field}>
                  <label style={styles.label}>
                    Unit
                  </label>

                  <select
                    value={productForm.unit}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        unit: e.target.value,
                      })
                    }
                    style={styles.input}
                  >
                    <option value="pcs">
                      Pieces / 件
                    </option>

                    <option value="roll">
                      Roll / 卷
                    </option>

                    <option value="meter">
                      Meter / 米
                    </option>

                    <option value="liter">
                      Liter / 升
                    </option>

                    <option value="set">
                      Set / 套
                    </option>

                    <option value="box">
                      Box / 箱
                    </option>
                  </select>
                </div>

                {/* COST */}

                {showCost && (
                  <div style={styles.field}>
                    <label style={styles.label}>
                      Cost Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        productForm.cost_price
                      }
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          cost_price:
                            e.target.value,
                        })
                      }
                      style={styles.input}
                      placeholder="0.00"
                    />
                  </div>
                )}

                {/* CURRENT STOCK */}

                <div style={styles.field}>
                  <label style={styles.label}>
                    Opening / Current Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      productForm.current_stock
                    }
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        current_stock:
                          e.target.value,
                      })
                    }
                    style={styles.input}
                  />
                </div>

                {/* MINIMUM STOCK */}

                <div style={styles.field}>
                  <label style={styles.label}>
                    Minimum Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      productForm.minimum_stock
                    }
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        minimum_stock:
                          e.target.value,
                      })
                    }
                    style={styles.input}
                  />
                </div>

                {/* DESCRIPTION */}

                <div
                  style={{
                    ...styles.field,
                    gridColumn: "1 / -1",
                  }}
                >
                  <label style={styles.label}>
                    Description
                  </label>

                  <textarea
                    value={
                      productForm.description
                    }
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description:
                          e.target.value,
                      })
                    }
                    style={{
                      ...styles.input,
                      minHeight: 90,
                      resize: "vertical",
                    }}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* =================================================
                  BUTTONS
              ================================================= */}

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() =>
                    setShowProductForm(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={
                    saving || uploadingImage
                  }
                >
                  {uploadingImage
                    ? "Uploading Photo..."
                    : saving
                    ? "Saving..."
                    : editingProduct
                    ? "Save Changes"
                    : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          STOCK MOVEMENT MODAL
      ===================================================== */}

      {showMovementForm &&
        selectedProduct && (
          <div style={styles.overlay}>
            <div style={styles.modalSmall}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    {movementType === "in"
                      ? "Add Stock"
                      : "Remove Stock"}
                  </h2>

                  <div
                    style={styles.modalChinese}
                  >
                    {movementType === "in"
                      ? "入库"
                      : "出库"}
                  </div>
                </div>

                <button
                  type="button"
                  style={styles.closeButton}
                  onClick={() =>
                    setShowMovementForm(false)
                  }
                >
                  ×
                </button>
              </div>

              <div style={styles.selectedProductBox}>
                {selectedProduct.image_url && (
                  <img
                    src={
                      selectedProduct.image_url
                    }
                    alt={selectedProduct.name}
                    style={
                      styles.movementProductImage
                    }
                  />
                )}

                <div>
                  <div
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    {selectedProduct.name}
                  </div>

                  <div
                    style={{
                      color: "#9ca3af",
                      fontSize: 12,
                    }}
                  >
                    SKU:{" "}
                    {selectedProduct.sku}
                  </div>

                  <div
                    style={{
                      color: "#d4af37",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    Current Stock:{" "}
                    {
                      selectedProduct.current_stock
                    }
                  </div>
                </div>
              </div>

              <form onSubmit={saveMovement}>
                <div style={styles.field}>
                  <label style={styles.label}>
                    Quantity *
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      movementForm.quantity
                    }
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        quantity:
                          e.target.value,
                      })
                    }
                    style={styles.input}
                    placeholder="Enter quantity"
                  />
                </div>

                {showCost && (
                  <div style={styles.field}>
                    <label style={styles.label}>
                      Unit Cost
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        movementForm.unit_cost
                      }
                      onChange={(e) =>
                        setMovementForm({
                          ...movementForm,
                          unit_cost:
                            e.target.value,
                        })
                      }
                      style={styles.input}
                    />
                  </div>
                )}

                <div style={styles.field}>
                  <label style={styles.label}>
                    Reference
                  </label>

                  <input
                    type="text"
                    value={
                      movementForm.reference
                    }
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        reference:
                          e.target.value,
                      })
                    }
                    style={styles.input}
                    placeholder="Invoice, PO, job number..."
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Notes
                  </label>

                  <textarea
                    value={movementForm.notes}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        notes: e.target.value,
                      })
                    }
                    style={{
                      ...styles.input,
                      minHeight: 80,
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={styles.modalFooter}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={() =>
                      setShowMovementForm(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    style={
                      movementType === "in"
                        ? styles.primaryButton
                        : styles.dangerButton
                    }
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : movementType === "in"
                      ? "Add Stock"
                      : "Remove Stock"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* =====================================================
          CATEGORY MODAL
      ===================================================== */}

      {showCategoryForm && (
        <div style={styles.overlay}>
          <div style={styles.modalSmall}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  Add Category
                </h2>

                <div style={styles.modalChinese}>
                  添加分类
                </div>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={() =>
                  setShowCategoryForm(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={saveCategory}>
              <div style={styles.field}>
                <label style={styles.label}>
                  Category Name *
                </label>

                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) =>
                    setCategoryName(
                      e.target.value
                    )
                  }
                  style={styles.input}
                  placeholder="e.g. PPF"
                  autoFocus
                />
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() =>
                    setShowCategoryForm(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          HISTORY MODAL
      ===================================================== */}

      {selectedProduct &&
        !showMovementForm &&
        !showProductForm &&
        !showCategoryForm &&
        history.length >= 0 && (
          <div style={styles.overlay}>
            <div style={styles.historyModal}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    Inventory History
                  </h2>

                  <div style={styles.modalChinese}>
                    库存记录
                  </div>
                </div>

                <button
                  type="button"
                  style={styles.closeButton}
                  onClick={() => {
                    setSelectedProduct(null);
                    setHistory([]);
                  }}
                >
                  ×
                </button>
              </div>

              <div style={styles.historyProduct}>
                {selectedProduct.image_url ? (
                  <img
                    src={
                      selectedProduct.image_url
                    }
                    alt={selectedProduct.name}
                    style={styles.historyProductImage}
                  />
                ) : (
                  <div
                    style={
                      styles.historyPlaceholder
                    }
                  >
                    📷
                  </div>
                )}

                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {selectedProduct.name}
                  </div>

                  <div
                    style={{
                      color: "#9ca3af",
                      fontSize: 12,
                    }}
                  >
                    SKU:{" "}
                    {selectedProduct.sku}
                  </div>
                </div>
              </div>

              {historyLoading ? (
                <div style={styles.emptyState}>
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <div style={styles.emptyState}>
                  No inventory movements found.
                </div>
              ) : (
                <div style={styles.historyList}>
                  {history.map((item) => {
                    const isIn =
                      item.movement_type ===
                      "in";

                    return (
                      <div
                        key={item.id}
                        style={
                          styles.historyItem
                        }
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: isIn
                                ? "#22c55e"
                                : "#ef4444",
                            }}
                          >
                            {isIn
                              ? "STOCK IN / 入库"
                              : "STOCK OUT / 出库"}
                          </div>

                          <div
                            style={{
                              color:
                                "#d1d5db",
                              marginTop: 4,
                            }}
                          >
                            Quantity:{" "}
                            {item.quantity}
                          </div>

                          {item.reference && (
                            <div
                              style={{
                                color:
                                  "#9ca3af",
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              Ref:{" "}
                              {
                                item.reference
                              }
                            </div>
                          )}

                          {item.notes && (
                            <div
                              style={{
                                color:
                                  "#9ca3af",
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              {
                                item.notes
                              }
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            textAlign:
                              "right",
                            color:
                              "#9ca3af",
                            fontSize: 12,
                          }}
                        >
                          {formatDate(
                            item.created_at
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    minHeight: "100%",
    background: "#0b0b0b",
    color: "#f5f5f5",
    padding: 24,
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 24,
  },

  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.5px",
  },

  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 4,
  },

  headerButtons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  primaryButton: {
    border: "1px solid #d4af37",
    background: "#d4af37",
    color: "#080808",
    padding: "11px 16px",
    borderRadius: 8,
    fontWeight: 800,
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #3f3f46",
    background: "#171717",
    color: "#f5f5f5",
    padding: "11px 16px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
  },

  dangerButton: {
    border: "1px solid #ef4444",
    background: "#ef4444",
    color: "#fff",
    padding: "11px 16px",
    borderRadius: 8,
    fontWeight: 800,
    cursor: "pointer",
  },

  cancelButton: {
    border: "1px solid #3f3f46",
    background: "#18181b",
    color: "#f5f5f5",
    padding: "11px 16px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
  },

  errorBox: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fca5a5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },

  messageBox: {
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.3)",
    color: "#86efac",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 18,
  },

  statCard: {
    background: "#111111",
    border: "1px solid #27272a",
    borderRadius: 12,
    padding: 16,
  },

  statLabel: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: 600,
  },

  statValue: {
    fontSize: 24,
    fontWeight: 800,
    marginTop: 6,
  },

  statChinese: {
    color: "#71717a",
    fontSize: 10,
    marginTop: 3,
  },

  filterBar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    minWidth: 240,
    background: "#111111",
    border: "1px solid #27272a",
    color: "#f5f5f5",
    borderRadius: 8,
    padding: "11px 13px",
    outline: "none",
  },

  select: {
    minWidth: 180,
    background: "#111111",
    border: "1px solid #27272a",
    color: "#f5f5f5",
    borderRadius: 8,
    padding: "11px 13px",
    outline: "none",
  },

  tableContainer: {
    background: "#111111",
    border: "1px solid #27272a",
    borderRadius: 12,
    overflowX: "auto",
    overflowY: "hidden",
  },

  table: {
    width: "100%",
    minWidth: 1050,
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "13px 12px",
    borderBottom: "1px solid #27272a",
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 12px",
    borderBottom: "1px solid #1f1f22",
    fontSize: 13,
    verticalAlign: "middle",
  },

  sku: {
    color: "#d4af37",
    fontWeight: 700,
    fontFamily: "monospace",
  },

  tableImage: {
    width: 52,
    height: 52,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #3f3f46",
    display: "block",
  },

  tableImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    border: "1px dashed #3f3f46",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#71717a",
    fontSize: 20,
    background: "#18181b",
  },

  statusBadge: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  actionGroup: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  smallButton: {
    background: "#18181b",
    border: "1px solid #3f3f46",
    color: "#f5f5f5",
    padding: "6px 8px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
  },

  smallDangerButton: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fca5a5",
    padding: "6px 8px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
  },

  smallDarkButton: {
    background: "#0b0b0b",
    border: "1px solid #27272a",
    color: "#a1a1aa",
    padding: "6px 8px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
  },

  emptyState: {
    padding: 50,
    textAlign: "center",
    color: "#71717a",
  },

  /* =======================================================
     MODAL
  ======================================================= */

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
    overflowY: "auto",
  },

  modal: {
    width: "min(760px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#111111",
    border: "1px solid #2f2f33",
    borderRadius: 14,
    boxShadow: "0 25px 80px rgba(0,0,0,0.55)",
    padding: 22,
  },

  modalSmall: {
    width: "min(500px, 100%)",
    background: "#111111",
    border: "1px solid #2f2f33",
    borderRadius: 14,
    boxShadow: "0 25px 80px rgba(0,0,0,0.55)",
    padding: 22,
  },

  historyModal: {
    width: "min(850px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#111111",
    border: "1px solid #2f2f33",
    borderRadius: 14,
    boxShadow: "0 25px 80px rgba(0,0,0,0.55)",
    padding: 22,
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 20,
  },

  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
  },

  modalChinese: {
    color: "#71717a",
    fontSize: 11,
    marginTop: 3,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 7,
    border: "1px solid #3f3f46",
    background: "#18181b",
    color: "#d4d4d8",
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
  },

  /* =======================================================
     IMAGE UPLOAD
  ======================================================= */

  imageUploadSection: {
    background: "#0c0c0c",
    border: "1px solid #27272a",
    borderRadius: 10,
    padding: 15,
    marginBottom: 18,
  },

  imageUploadLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#d4d4d8",
    marginBottom: 12,
  },

  imageUploadContent: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
  },

  imagePreviewWrapper: {
    width: 130,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid #3f3f46",
    background: "#18181b",
    flexShrink: 0,
  },

  imagePreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  largeImagePlaceholder: {
    width: 130,
    height: 100,
    borderRadius: 10,
    border: "1px dashed #3f3f46",
    background: "#18181b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  placeholderIcon: {
    fontSize: 30,
    opacity: 0.7,
  },

  imagePlaceholderText: {
    fontSize: 11,
    color: "#a1a1aa",
    marginTop: 3,
  },

  imagePlaceholderChinese: {
    fontSize: 9,
    color: "#52525b",
    marginTop: 2,
  },

  imageButtons: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  chooseImageButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#d4af37",
    color: "#090909",
    borderRadius: 7,
    padding: "9px 12px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },

  removeImageButton: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fca5a5",
    borderRadius: 7,
    padding: "8px 11px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  imageHelpText: {
    width: "100%",
    color: "#71717a",
    fontSize: 10,
  },

  /* =======================================================
     FORM
  ======================================================= */

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 15,
  },

  field: {
    marginBottom: 14,
  },

  label: {
    display: "block",
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0b0b0b",
    border: "1px solid #3f3f46",
    color: "#f5f5f5",
    borderRadius: 7,
    padding: "10px 11px",
    outline: "none",
    fontSize: 13,
  },

  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid #27272a",
  },

  /* =======================================================
     SELECTED PRODUCT
  ======================================================= */

  selectedProductBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#0b0b0b",
    border: "1px solid #27272a",
    borderRadius: 9,
    padding: 12,
    marginBottom: 18,
  },

  movementProductImage: {
    width: 55,
    height: 55,
    objectFit: "cover",
    borderRadius: 7,
    border: "1px solid #3f3f46",
  },

  /* =======================================================
     HISTORY
  ======================================================= */

  historyProduct: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#0b0b0b",
    border: "1px solid #27272a",
    borderRadius: 9,
    padding: 12,
    marginBottom: 15,
  },

  historyProductImage: {
    width: 60,
    height: 60,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #3f3f46",
  },

  historyPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    border: "1px dashed #3f3f46",
    background: "#18181b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    background: "#0b0b0b",
    border: "1px solid #27272a",
    borderRadius: 9,
    padding: 13,
  },
};

