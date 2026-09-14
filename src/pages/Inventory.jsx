import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";
import { canSeeInventoryCost } from "../utils/permissions";

function Inventory() {
  const loggedInUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const showCost = canSeeInventoryCost(loggedInUser);
  const isAdmin = loggedInUser?.role === "admin";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const [movementType, setMovementType] = useState("IN");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [categoryName, setCategoryName] = useState("");

  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    category_id: "",
    unit: "pcs",
    cost_price: "",
    current_stock: "0",
    minimum_stock: "0",
    description: "",
  });

  const [movementForm, setMovementForm] = useState({
    quantity: "",
    unit_cost: "",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    await Promise.all([
      loadCategories(),
      loadProducts(),
    ]);

    setLoading(false);
  }

  async function loadProducts() {
    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (!user?.shop_id) {
      setProducts([]);
      setError("Your account is not connected to a shop.");
      return;
    }

    const { data, error } = await supabase
      .from("inventory_products")
      .select(`
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
        shop_id
      `)
      .eq("shop_id", user.shop_id)
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("LOAD PRODUCTS ERROR:", error);
      setProducts([]);
      setError(error.message);
      return;
    }

    setProducts(data || []);
  }

  async function loadCategories() {
    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (!user?.shop_id) {
      setCategories([]);
      return;
    }

    const { data, error } = await supabase
      .from("inventory_categories")
      .select(`
        id,
        name,
        description,
        active,
        shop_id
      `)
      .eq("shop_id", user.shop_id)
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("LOAD CATEGORIES ERROR:", error);
      setCategories([]);
      setError(error.message);
      return;
    }

    setCategories(data || []);
  }

  function getCategoryName(categoryId) {
    if (
      categoryId === null ||
      categoryId === undefined ||
      categoryId === ""
    ) {
      return "No Category";
    }

    const category = categories.find(
      (item) =>
        String(item.id) === String(categoryId)
    );

    return category?.name || "No Category";
  }

  function getStatus(product) {
    const stock = Number(product.current_stock || 0);
    const minimum = Number(product.minimum_stock || 0);

    if (stock <= 0) {
      return "OUT";
    }

    if (stock <= minimum) {
      return "LOW";
    }

    return "OK";
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchText = search
        .trim()
        .toLowerCase();

      const matchesSearch =
        !searchText ||
        String(product.name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.sku || "")
          .toLowerCase()
          .includes(searchText);

      const matchesCategory =
        !categoryFilter ||
        String(product.category_id) ===
          String(categoryFilter);

      const matchesStatus =
        !statusFilter ||
        getStatus(product) === statusFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    products,
    categories,
    search,
    categoryFilter,
    statusFilter,
  ]);

  const totalProducts = products.length;

  const lowStock = products.filter(
    (product) =>
      Number(product.current_stock || 0) > 0 &&
      Number(product.current_stock || 0) <=
        Number(product.minimum_stock || 0)
  ).length;

  const outOfStock = products.filter(
    (product) =>
      Number(product.current_stock || 0) <= 0
  ).length;

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.current_stock || 0) *
        Number(product.cost_price || 0),
    0
  );

  function openAddProduct() {
    if (!isAdmin) {
      setError("Only administrators can add products.");
      return;
    }

    setEditingProduct(null);

    setProductForm({
      sku: "",
      name: "",
      category_id: "",
      unit: "pcs",
      cost_price: "",
      current_stock: "0",
      minimum_stock: "0",
      description: "",
    });

    setError("");
    setMessage("");
    setShowProductForm(true);
  }

  function openEditProduct(product) {
    if (!isAdmin) {
      setError("Only administrators can edit products.");
      return;
    }

    setEditingProduct(product);

    setProductForm({
      sku: product.sku || "",
      name: product.name || "",
      category_id:
        product.category_id !== null &&
        product.category_id !== undefined
          ? String(product.category_id)
          : "",
      unit: product.unit || "pcs",
      cost_price:
        product.cost_price !== null &&
        product.cost_price !== undefined
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
    });

    setError("");
    setMessage("");
    setShowProductForm(true);
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (!isAdmin) {
      setError(
        "Only administrators can add or edit products."
      );
      return;
    }

    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (!user?.shop_id) {
      setError(
        "Your account is not connected to a shop."
      );
      return;
    }

    if (!productForm.sku.trim()) {
      setError("SKU is required.");
      return;
    }

    if (!productForm.name.trim()) {
      setError("Product name is required.");
      return;
    }

    const currentStock = Number(
      productForm.current_stock || 0
    );

    const minimumStock = Number(
      productForm.minimum_stock || 0
    );

    const costPrice = Number(
      productForm.cost_price || 0
    );

    if (currentStock < 0) {
      setError("Stock cannot be negative.");
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

    let categoryId = null;

    if (productForm.category_id !== "") {
      categoryId = Number(productForm.category_id);

      if (!Number.isInteger(categoryId)) {
        setError("Invalid category selected.");
        return;
      }

      const selectedCategory = categories.find(
        (category) =>
          Number(category.id) === categoryId
      );

      if (!selectedCategory) {
        setError(
          "The selected category could not be found."
        );
        return;
      }

      if (
        String(selectedCategory.shop_id) !==
        String(user.shop_id)
      ) {
        setError(
          "The selected category belongs to another shop."
        );
        return;
      }
    }

    const productData = {
      sku: productForm.sku.trim(),
      name: productForm.name.trim(),
      category_id: categoryId,
      unit: productForm.unit || "pcs",
      cost_price: costPrice,
      current_stock: currentStock,
      minimum_stock: minimumStock,
      description:
        productForm.description.trim() || null,
      shop_id: user.shop_id,
      active: true,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingProduct) {
        const { error: updateError } = await supabase
          .from("inventory_products")
          .update(productData)
          .eq("id", editingProduct.id)
          .eq("shop_id", user.shop_id);

        if (updateError) {
          console.error(
            "UPDATE PRODUCT ERROR:",
            updateError
          );

          setError(updateError.message);
          setSaving(false);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("inventory_products")
          .insert(productData);

        if (insertError) {
          console.error(
            "INSERT PRODUCT ERROR:",
            insertError
          );

          setError(insertError.message);
          setSaving(false);
          return;
        }
      }

      await loadCategories();
      await loadProducts();

      setShowProductForm(false);
      setEditingProduct(null);

      setMessage(
        editingProduct
          ? "Product updated successfully."
          : "Product added successfully."
      );
    } catch (err) {
      console.error("SAVE PRODUCT EXCEPTION:", err);
      setError(
        err?.message ||
          "An unexpected error occurred while saving the product."
      );
    }

    setSaving(false);
  }

  function openAddCategory() {
    if (!isAdmin) {
      setError(
        "Only administrators can add categories."
      );
      return;
    }

    setCategoryName("");
    setError("");
    setMessage("");
    setShowCategoryForm(true);
  }

  async function saveCategory(event) {
    event.preventDefault();

    if (!isAdmin) {
      setError(
        "Only administrators can add categories."
      );
      return;
    }

    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (!user?.shop_id) {
      setError(
        "Your account is not connected to a shop."
      );
      return;
    }

    if (!categoryName.trim()) {
      setError("Category name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { data: existingCategory, error: findError } =
      await supabase
        .from("inventory_categories")
        .select("id, name, shop_id")
        .eq("name", categoryName.trim())
        .eq("shop_id", user.shop_id)
        .maybeSingle();

    if (findError) {
      console.error(
        "CHECK CATEGORY ERROR:",
        findError
      );

      setError(findError.message);
      setSaving(false);
      return;
    }

    if (existingCategory) {
      setError(
        "A category with this name already exists."
      );
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("inventory_categories")
      .insert({
        name: categoryName.trim(),
        shop_id: user.shop_id,
        active: true,
      });

    if (insertError) {
      console.error(
        "SAVE CATEGORY ERROR:",
        insertError
      );

      setError(insertError.message);
      setSaving(false);
      return;
    }

    await loadCategories();

    setCategoryName("");
    setShowCategoryForm(false);
    setSaving(false);

    setMessage("Category added successfully.");
  }

  function openMovement(product, type) {
    setSelectedProduct(product);
    setMovementType(type);

    setMovementForm({
      quantity: "",
      unit_cost:
        Number(product.cost_price || 0) > 0
          ? String(product.cost_price)
          : "",
      reference: "",
      notes: "",
    });

    setShowMovementForm(true);
    setError("");
    setMessage("");

    loadHistory(product.id);
  }

  async function saveMovement(event) {
    event.preventDefault();

    if (!selectedProduct) {
      setError("No product selected.");
      return;
    }

    const quantity = Number(
      movementForm.quantity
    );

    if (!quantity || quantity <= 0) {
      setError(
        "Enter a quantity greater than zero."
      );
      return;
    }

    if (
      movementType === "OUT" &&
      quantity >
        Number(selectedProduct.current_stock || 0)
    ) {
      setError(
        `Only ${selectedProduct.current_stock} ${selectedProduct.unit} available.`
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase.rpc(
      "record_inventory_movement",
      {
        p_product_id: selectedProduct.id,
        p_movement_type: movementType,
        p_quantity: quantity,
        p_supplier_id: null,
        p_job_id: null,
        p_user_id: null,
        p_reference:
          movementForm.reference.trim() || null,
        p_notes:
          movementForm.notes.trim() || null,
        p_unit_cost:
          movementForm.unit_cost === ""
            ? null
            : Number(movementForm.unit_cost),
      }
    );

    if (error) {
      console.error(
        "SAVE MOVEMENT ERROR:",
        error
      );

      setError(error.message);
      setSaving(false);
      return;
    }

    await loadProducts();

    setShowMovementForm(false);
    setSaving(false);

    setMessage(
      movementType === "IN"
        ? "Stock added successfully."
        : "Stock removed successfully."
    );
  }

  async function loadHistory(productId) {
    setHistoryLoading(true);

    const { data, error } = await supabase
      .from("inventory_stock_movements")
      .select(`
        id,
        movement_type,
        quantity,
        unit_cost,
        reference,
        notes,
        created_at
      `)
      .eq("product_id", productId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "LOAD HISTORY ERROR:",
        error
      );
      setHistory([]);
    } else {
      setHistory(data || []);
    }

    setHistoryLoading(false);
  }

  function statusLabel(status) {
    if (status === "OUT") return "OUT OF STOCK";
    if (status === "LOW") return "LOW STOCK";
    return "IN STOCK";
  }

  function statusColor(status) {
    if (status === "OUT") return "#dc2626";
    if (status === "LOW") return "#d97706";
    return "#16a34a";
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Inventory
          </h1>

          <p style={styles.subtitle}>
            Manage products, categories, stock
            and inventory movements.
          </p>
        </div>

        {isAdmin && (
          <div style={styles.headerButtons}>
            <button
              style={styles.secondaryButton}
              onClick={openAddCategory}
            >
              + Add Category
            </button>

            <button
              style={styles.primaryButton}
              onClick={openAddProduct}
            >
              + Add Product
            </button>
          </div>
        )}
      </div>

      {message && (
        <div style={styles.success}>
          {message}
        </div>
      )}

      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={styles.stats}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>
            Products
          </div>

          <div style={styles.cardValue}>
            {totalProducts}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>
            Low Stock
          </div>

          <div
            style={{
              ...styles.cardValue,
              color: "#d97706",
            }}
          >
            {lowStock}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>
            Out of Stock
          </div>

          <div
            style={{
              ...styles.cardValue,
              color: "#dc2626",
            }}
          >
            {outOfStock}
          </div>
        </div>

        {isAdmin && (
          <div style={styles.card}>
            <div style={styles.cardLabel}>
              Inventory Value
            </div>

            <div style={styles.cardValue}>
              QAR {inventoryValue.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      <div style={styles.filters}>
        <input
          style={styles.search}
          placeholder="Search by product or SKU..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          style={styles.select}
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value)
          }
        >
          <option value="">
            All Categories
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
          style={styles.select}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="">
            All Status
          </option>

          <option value="OK">
            In Stock
          </option>

          <option value="LOW">
            Low Stock
          </option>

          <option value="OUT">
            Out of Stock
          </option>
        </select>

        <button
          style={styles.refreshButton}
          onClick={loadData}
        >
          Refresh
        </button>
      </div>

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.empty}>
            Loading inventory...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={styles.empty}>
            No products match your search.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Min.</th>

                {isAdmin && (
                  <th style={styles.th}>
                    Cost
                  </th>
                )}

                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const status = getStatus(product);

                return (
                  <tr key={product.id}>
                    <td style={styles.td}>
                      <strong>
                        {product.sku}
                      </strong>
                    </td>

                  <td style={styles.td}>
  <strong style={{ color: "#fff", fontWeight: "700" }}>
    {product.name}
  </strong>
</td>

                    <td style={styles.td}>
                      {getCategoryName(
                        product.category_id
                      )}
                    </td>

                    <td style={styles.td}>
                      <strong>
                        {product.current_stock}
                      </strong>{" "}
                      {product.unit}
                    </td>

                    <td style={styles.td}>
                      {product.minimum_stock}
                    </td>

                    {isAdmin && (
                      <td style={styles.td}>
                        QAR{" "}
                        {Number(
                          product.cost_price || 0
                        ).toFixed(2)}
                      </td>
                    )}

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.status,
                          color:
                            statusColor(status),
                          backgroundColor:
                            `${statusColor(
                              status
                            )}15`,
                        }}
                      >
                        {statusLabel(status)}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.actions}>
                        {isAdmin && (
                          <button
                            style={
                              styles.editButton
                            }
                            onClick={() =>
                              openEditProduct(
                                product
                              )
                            }
                          >
                            Edit
                          </button>
                        )}

                        <button
                          style={styles.inButton}
                          onClick={() =>
                            openMovement(
                              product,
                              "IN"
                            )
                          }
                        >
                          + Stock
                        </button>

                        <button
                          style={styles.outButton}
                          onClick={() =>
                            openMovement(
                              product,
                              "OUT"
                            )
                          }
                        >
                          - Stock
                        </button>

                        <button
                          style={
                            styles.historyButton
                          }
                          onClick={() => {
                            setSelectedProduct(
                              product
                            );
                            setHistory([]);
                            loadHistory(
                              product.id
                            );
                          }}
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

      {showCategoryForm && (
        <div style={styles.overlay}>
          <div style={styles.smallModal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  Add Category
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  Add a category for this shop.
                </p>
              </div>

              <button
                style={styles.closeButton}
                onClick={() =>
                  setShowCategoryForm(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={saveCategory}>
              <label style={styles.label}>
                Category Name *

                <input
                  autoFocus
                  style={styles.input}
                  value={categoryName}
                  onChange={(e) =>
                    setCategoryName(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Window Tinting Materials"
                />
              </label>

              <div
                style={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  style={
                    styles.cancelButton
                  }
                  onClick={() =>
                    setShowCategoryForm(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={
                    styles.primaryButton
                  }
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  {editingProduct
                    ? "Update product information."
                    : "Add a new inventory item."}
                </p>
              </div>

              <button
                style={styles.closeButton}
                onClick={() => {
                  setShowProductForm(false);
                  setEditingProduct(null);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <div style={styles.formGrid}>
                <label style={styles.label}>
                  SKU *

                  <input
                    style={styles.input}
                    value={productForm.sku}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        sku: e.target.value,
                      })
                    }
                  />
                </label>

                <label style={styles.label}>
                  Product Name *

                  <input
                    style={styles.input}
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        name: e.target.value,
                      })
                    }
                  />
                </label>

                <label style={styles.label}>
                  Category

                  <div style={styles.categoryRow}>
                    <select
                      style={{
                        ...styles.input,
                        flex: 1,
                      }}
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
                    >
                      <option value="">
                        No Category
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

                    {isAdmin && (
                      <button
                        type="button"
                        style={
                          styles.addSmallButton
                        }
                        onClick={
                          openAddCategory
                        }
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </label>

                <label style={styles.label}>
                  Unit

                  <select
                    style={styles.input}
                    value={productForm.unit}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        unit: e.target.value,
                      })
                    }
                  >
                    <option value="pcs">
                      Pieces
                    </option>
                    <option value="box">
                      Box
                    </option>
                    <option value="bottle">
                      Bottle
                    </option>
                    <option value="liter">
                      Liter
                    </option>
                    <option value="kg">
                      Kilogram
                    </option>
                    <option value="roll">
                      Roll
                    </option>
                    <option value="sack">
                      Sack
                    </option>
                    <option value="piece">
                      Piece
                    </option>
                  </select>
                </label>

                {isAdmin && (
                  <label style={styles.label}>
                    Cost Price (QAR)

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      style={styles.input}
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
                    />
                  </label>
                )}

                <label style={styles.label}>
                  {editingProduct
                    ? "Current Stock"
                    : "Opening Stock"}

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    style={styles.input}
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
                  />
                </label>

                <label style={styles.label}>
                  Minimum Stock

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    style={styles.input}
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
                  />
                </label>
              </div>

              <label style={styles.label}>
                Description

                <textarea
                  style={{
                    ...styles.input,
                    minHeight: "80px",
                    resize: "vertical",
                  }}
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
                />
              </label>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
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
                    : editingProduct
                    ? "Update Product"
                    : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMovementForm &&
        selectedProduct && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <div>
                  <h2
                    style={styles.modalTitle}
                  >
                    {movementType === "IN"
                      ? "Stock In"
                      : "Stock Out"}
                  </h2>

                  <p
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {selectedProduct.name}
                  </p>
                </div>

                <button
                  style={styles.closeButton}
                  onClick={() =>
                    setShowMovementForm(false)
                  }
                >
                  ×
                </button>
              </div>

              <div style={styles.stockInfo}>
                Current Stock:{" "}
                <strong>
                  {selectedProduct.current_stock}{" "}
                  {selectedProduct.unit}
                </strong>
              </div>

              <form onSubmit={saveMovement}>
                <label style={styles.label}>
                  Quantity *

                  <input
                    autoFocus
                    type="number"
                    min="0.001"
                    step="0.001"
                    style={styles.input}
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
                  />
                </label>

                {showCost && (
                  <label style={styles.label}>
                    Unit Cost (QAR)

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      style={styles.input}
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
                    />
                  </label>
                )}

                <label style={styles.label}>
                  Reference

                  <input
                    style={styles.input}
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
                  />
                </label>

                <label style={styles.label}>
                  Notes

                  <textarea
                    style={styles.input}
                    value={movementForm.notes}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </label>

                <div style={styles.modalActions}>
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
                      movementType === "IN"
                        ? styles.inPrimaryButton
                        : styles.outPrimaryButton
                    }
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : movementType === "IN"
                      ? "Add Stock"
                      : "Remove Stock"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {selectedProduct &&
        !showMovementForm &&
        !showProductForm &&
        !showCategoryForm && (
          <div style={styles.historyPanel}>
            <div style={styles.historyHeader}>
              <div>
                <h2 style={styles.historyTitle}>
                  {selectedProduct.name}
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  Stock movement history
                </p>
              </div>

              <button
                style={styles.closeButton}
                onClick={() =>
                  setSelectedProduct(null)
                }
              >
                ×
              </button>
            </div>

            <div style={styles.stockInfo}>
              Current Stock:{" "}
              <strong>
                {selectedProduct.current_stock}{" "}
                {selectedProduct.unit}
              </strong>
            </div>

            {historyLoading ? (
              <div style={styles.empty}>
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div style={styles.empty}>
                No stock movements recorded yet.
              </div>
            ) : (
              <div style={styles.historyTable}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>
                        Date
                      </th>
                      <th style={styles.th}>
                        Type
                      </th>
                      <th style={styles.th}>
                        Quantity
                      </th>
                      <th style={styles.th}>
                        Reference
                      </th>
                      <th style={styles.th}>
                        Notes
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((movement) => (
                      <tr key={movement.id}>
                        <td style={styles.td}>
                          {new Date(
                            movement.created_at
                          ).toLocaleString()}
                        </td>

                        <td style={styles.td}>
                          <strong>
                            {
                              movement.movement_type
                            }
                          </strong>
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            color:
                              movement.movement_type ===
                              "IN"
                                ? "#16a34a"
                                : "#dc2626",
                            fontWeight: "700",
                          }}
                        >
                          {movement.movement_type ===
                          "IN"
                            ? "+"
                            : "-"}
                          {Number(
                            movement.quantity
                          ).toLocaleString()}
                        </td>

                        <td style={styles.td}>
                          {movement.reference ||
                            "-"}
                        </td>

                        <td style={styles.td}>
                          {movement.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    maxWidth: "1500px",
    margin: "0 auto",
    background: "#0b0b0b",
    color: "#f5f5f5",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    gap: "20px",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "700",
    color: "#d4af37",
  },

  subtitle: {
    marginTop: "6px",
    color: "#a3a3a3",
  },

  primaryButton: {
    border: "none",
    background: "#d4af37",
    color: "#080808",
    padding: "11px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  secondaryButton: {
    border: "1px solid #d4af37",
    background: "#151515",
    color: "#d4af37",
    padding: "10px 17px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  addSmallButton: {
    border: "none",
    background: "#d4af37",
    color: "#080808",
    padding: "10px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  editButton: {
    border: "none",
    background: "#d4af37",
    color: "#080808",
    padding: "6px 10px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  inPrimaryButton: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  outPrimaryButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  refreshButton: {
    border: "1px solid #d4af37",
    background: "#151515",
    color: "#d4af37",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  success: {
    background: "#102318",
    color: "#86efac",
    border: "1px solid #166534",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "18px",
  },

  error: {
    background: "#2a1111",
    color: "#fca5a5",
    border: "1px solid #991b1b",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "18px",
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },

  card: {
    background: "#151515",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
  },

  cardLabel: {
    color: "#a3a3a3",
    fontSize: "14px",
  },

  cardValue: {
    fontSize: "27px",
    fontWeight: "700",
    marginTop: "8px",
    color: "#d4af37",
  },

  filters: {
    display: "flex",
    gap: "10px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  search: {
    flex: "1 1 300px",
    padding: "11px 14px",
    border: "1px solid #555",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#222",
    color: "#fff",
    outline: "none",
  },

  select: {
    padding: "11px 14px",
    border: "1px solid #555",
    borderRadius: "8px",
    background: "#222",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
    outline: "none",
  },

  tableContainer: {
    background: "#151515",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    overflowX: "auto",
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
  },

  historyTable: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "14px",
    background: "#1d1a12",
    color: "#d4af37",
    borderBottom: "1px solid #3b321c",
    fontSize: "13px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid #292929",
    fontSize: "14px",
    color: "#e5e5e5",
    whiteSpace: "nowrap",
  },

  status: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
  },

  actions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },

  inButton: {
    border: "1px solid #166534",
    background: "#102318",
    color: "#86efac",
    padding: "6px 9px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  outButton: {
    border: "1px solid #991b1b",
    background: "#2a1111",
    color: "#fca5a5",
    padding: "6px 9px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  historyButton: {
    border: "1px solid #555",
    background: "#222",
    color: "#d4af37",
    padding: "6px 9px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  empty: {
    padding: "40px",
    textAlign: "center",
    color: "#888",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    background: "#151515",
    color: "#f5f5f5",
    border: "1px solid #3b321c",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "700px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "25px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
  },

  smallModal: {
    background: "#151515",
    color: "#f5f5f5",
    border: "1px solid #3b321c",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "450px",
    padding: "25px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "23px",
    color: "#d4af37",
    fontWeight: "bold",
  },

  modalSubtitle: {
    color: "#999",
    marginTop: "5px",
  },

  closeButton: {
    border: "1px solid #444",
    background: "#222",
    color: "#d4af37",
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    fontSize: "22px",
    cursor: "pointer",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "15px",
  },

  categoryRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#d4d4d4",
    marginBottom: "15px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #555",
    borderRadius: "8px",
    background: "#222",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "400",
    outline: "none",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },

  cancelButton: {
    border: "1px solid #555",
    background: "#222",
    color: "#ddd",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  stockInfo: {
    background: "#1d1a12",
    color: "#ddd",
    border: "1px solid #3b321c",
    padding: "13px",
    borderRadius: "8px",
    marginBottom: "18px",
  },

  historyPanel: {
    marginTop: "25px",
    background: "#151515",
    color: "#f5f5f5",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px",
    borderBottom: "1px solid #3b321c",
  },

  historyTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#d4af37",
    fontWeight: "bold",
  },
};

export default Inventory;