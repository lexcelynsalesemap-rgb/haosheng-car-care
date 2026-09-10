import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";

function Inventory() {
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

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movementType, setMovementType] = useState("IN");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
    loadProducts();
    loadCategories();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("inventory_products")
      .select(`
        id,
        sku,
        name,
        unit,
        cost_price,
        current_stock,
        minimum_stock,
        active,
        description,
        category_id,
        inventory_categories (
          name
        )
      `)
      .order("name");

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("inventory_categories")
      .select("id, name")
      .eq("active", true)
      .order("name");

    if (!error) {
      setCategories(data || []);
    }
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setHistory([]);
    } else {
      setHistory(data || []);
    }

    setHistoryLoading(false);
  }

  function getStatus(product) {
    if (Number(product.current_stock) <= 0) {
      return "OUT";
    }

    if (
      Number(product.current_stock) <=
      Number(product.minimum_stock)
    ) {
      return "LOW";
    }

    return "OK";
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(searchText) ||
        product.sku.toLowerCase().includes(searchText);

      const matchesCategory =
        !categoryFilter ||
        String(product.category_id) === String(categoryFilter);

      const matchesStatus =
        !statusFilter ||
        getStatus(product) === statusFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [products, search, categoryFilter, statusFilter]);

  const totalProducts = products.length;

  const lowStock = products.filter(
    (p) =>
      Number(p.current_stock) > 0 &&
      Number(p.current_stock) <= Number(p.minimum_stock)
  ).length;

  const outOfStock = products.filter(
    (p) => Number(p.current_stock) <= 0
  ).length;

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.current_stock) *
        Number(product.cost_price || 0),
    0
  );

  function openAddProduct() {
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

    setShowProductForm(true);
    setMessage("");
    setError("");
  }

  async function saveProduct(event) {
  event.preventDefault();

  if (!productForm.sku.trim()) {
    setError("SKU is required.");
    return;
  }

  if (!productForm.name.trim()) {
    setError("Product name is required.");
    return;
  }

  if (Number(productForm.current_stock) < 0) {
    setError("Stock cannot be negative.");
    return;
  }

  setSaving(true);
  setError("");
  setMessage("");

  const { error } = await supabase
    .from("inventory_products")
    .insert({
      sku: productForm.sku.trim(),
      name: productForm.name.trim(),
      category_id: productForm.category_id || null,
      unit: productForm.unit || "pcs",
      cost_price: Number(productForm.cost_price) || 0,
      current_stock: Number(productForm.current_stock) || 0,
      minimum_stock: Number(productForm.minimum_stock) || 0,
      description: productForm.description.trim() || null,
    });

  setSaving(false);

  if (error) {
    console.error(error);
    setError(error.message);
    return;
  }

  setShowProductForm(false);
  setMessage("Product added successfully.");

  await loadProducts();
}
  function openMovement(product, type) {
    setSelectedProduct(product);
    setMovementType(type);

    setMovementForm({
      quantity: "",
      unit_cost:
        Number(product.cost_price) > 0
          ? product.cost_price
          : "",
      reference: "",
      notes: "",
    });

    setShowMovementForm(true);
    setMessage("");
    setError("");

    loadHistory(product.id);
  }

  async function saveMovement(event) {
    event.preventDefault();

    const quantity = Number(movementForm.quantity);

    if (!quantity || quantity <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }

    if (
      movementType === "OUT" &&
      quantity > Number(selectedProduct.current_stock)
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

    setSaving(false);

    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }

    setShowMovementForm(false);
    setMessage(
      movementType === "IN"
        ? "Stock added successfully."
        : "Stock removed successfully."
    );

    await loadProducts();
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
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Inventory</h1>
          <p style={styles.subtitle}>
            Manage products, stock and inventory movements.
          </p>
        </div>

        <button
          style={styles.primaryButton}
          onClick={openAddProduct}
        >
          + Add Product
        </button>
      </div>

      {/* MESSAGE */}
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

      {/* STATS */}
      <div style={styles.stats}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Products</div>
          <div style={styles.cardValue}>
            {totalProducts}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Low Stock</div>
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

        <div style={styles.card}>
          <div style={styles.cardLabel}>
            Inventory Value
          </div>
          <div style={styles.cardValue}>
            QAR {inventoryValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={styles.filters}>
        <input
          style={styles.search}
          placeholder="🔍 Search by product or SKU..."
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
          <option value="">All Categories</option>

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
          <option value="">All Status</option>
          <option value="OK">In Stock</option>
          <option value="LOW">Low Stock</option>
          <option value="OUT">
            Out of Stock
          </option>
        </select>

        <button
          style={styles.refreshButton}
          onClick={loadProducts}
        >
          Refresh
        </button>
      </div>

      {/* TABLE */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.empty}>
            Loading inventory...
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
                <th style={styles.th}>Cost</th>
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
                      <strong>{product.sku}</strong>
                    </td>

                    <td style={styles.td}>
                      {product.name}
                    </td>

                    <td style={styles.td}>
                      {product.inventory_categories?.name ||
                        "-"}
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

                    <td style={styles.td}>
                      QAR{" "}
                      {Number(
                        product.cost_price
                      ).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.status,
                          color: statusColor(status),
                          backgroundColor:
                            `${statusColor(status)}15`,
                        }}
                      >
                        {statusLabel(status)}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.actions}>
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
                          style={styles.historyButton}
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

        {!loading &&
          filteredProducts.length === 0 && (
            <div style={styles.empty}>
              No products match your search.
            </div>
          )}
      </div>

      {/* ADD PRODUCT MODAL */}
      {showProductForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  Add Product
                </h2>
                <p style={styles.modalSubtitle}>
                  Add a new inventory item.
                </p>
              </div>

              <button
                style={styles.closeButton}
                onClick={() =>
                  setShowProductForm(false)
                }
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
                    placeholder="e.g. OIL-001"
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
                    placeholder="e.g. Engine Oil"
                  />
                </label>

                <label style={styles.label}>
                  Category
                  <select
                    style={styles.input}
                    value={productForm.category_id}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        category_id:
                          e.target.value,
                      })
                    }
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
                  </select>
                </label>

                <label style={styles.label}>
                  Cost Price (QAR)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={styles.input}
                    value={productForm.cost_price}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        cost_price:
                          e.target.value,
                      })
                    }
                  />
                </label>

                <label style={styles.label}>
                  Opening Stock
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
                  value={productForm.description}
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
                  onClick={() =>
                    setShowProductForm(false)
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
                    : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK MOVEMENT MODAL */}
      {showMovementForm && selectedProduct && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  {movementType === "IN"
                    ? "Stock In"
                    : "Stock Out"}
                </h2>

                <p style={styles.modalSubtitle}>
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
                  value={movementForm.quantity}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      quantity:
                        e.target.value,
                    })
                  }
                  placeholder="Enter quantity"
                />
              </label>

              <label style={styles.label}>
                Unit Cost (QAR)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={styles.input}
                  value={movementForm.unit_cost}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      unit_cost:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label style={styles.label}>
                Reference
                <input
                  style={styles.input}
                  value={movementForm.reference}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      reference:
                        e.target.value,
                    })
                  }
                  placeholder="Invoice / PO / reference"
                />
              </label>

              <label style={styles.label}>
                Notes
                <textarea
                  style={{
                    ...styles.input,
                    minHeight: "80px",
                  }}
                  value={movementForm.notes}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Optional notes"
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

      {/* HISTORY PANEL */}
      {selectedProduct &&
        !showMovementForm &&
        !showProductForm &&
        history.length >= 0 && (
          <div style={styles.historyPanel}>
            <div style={styles.historyHeader}>
              <div>
                <h2 style={styles.historyTitle}>
                  {selectedProduct.name}
                </h2>
                <p style={styles.modalSubtitle}>
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
                          {movement.movement_type}
                        </strong>
                      </td>

                     <td
  style={{
    ...styles.td,
    color:
      movement.movement_type === "IN"
        ? "#16a34a"
        : "#dc2626",
    fontWeight: "700",
  }}
>
  {movement.movement_type === "IN" ? "+" : "-"}
  {Number(movement.quantity).toLocaleString()}
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
            )}
          </div>
        )}
    </div>
  );
}

const styles = {
  page: {
    padding: "30px",
    maxWidth: "1500px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    gap: "20px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "700",
  },

  subtitle: {
    marginTop: "6px",
    color: "#6b7280",
  },

  primaryButton: {
    border: "none",
    background: "#111827",
    color: "white",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  inPrimaryButton: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  outPrimaryButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  refreshButton: {
    border: "none",
    background: "#e5e7eb",
    color: "#111827",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  success: {
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "18px",
  },

  error: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "18px",
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(180px, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },

  card: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px",
  },

  cardLabel: {
    color: "#6b7280",
    fontSize: "14px",
  },

  cardValue: {
    fontSize: "27px",
    fontWeight: "700",
    marginTop: "8px",
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
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
  },

  select: {
    padding: "11px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "white",
    fontSize: "14px",
  },

  tableContainer: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "13px",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "14px",
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
  },

  inButton: {
    border: "none",
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 9px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  outButton: {
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "6px 9px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  historyButton: {
    border: "none",
    background: "#e5e7eb",
    color: "#374151",
    padding: "6px 9px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  empty: {
    padding: "40px",
    textAlign: "center",
    color: "#6b7280",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    background: "white",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "700px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "25px",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.25)",
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
  },

  modalSubtitle: {
    color: "#6b7280",
    marginTop: "5px",
  },

  closeButton: {
    border: "none",
    background: "#f3f4f6",
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    fontSize: "22px",
    cursor: "pointer",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "15px",
  },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "15px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "400",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },

  cancelButton: {
    border: "1px solid #d1d5db",
    background: "white",
    color: "#374151",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  stockInfo: {
    background: "#f3f4f6",
    padding: "13px",
    borderRadius: "8px",
    marginBottom: "18px",
  },

  historyPanel: {
    marginTop: "25px",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px",
    borderBottom: "1px solid #e5e7eb",
  },

  historyTitle: {
    margin: 0,
    fontSize: "20px",
  },
};

export default Inventory;