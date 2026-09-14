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

  /*
   * CHINESE TRANSLATIONS
   * These are stored ONLY in this React file.
   * No Supabase columns are required.
   */

  const categoryChinese = {
    "Compounds & Chemicals": "研磨剂和化学品",
    "Gloves & PPE": "手套和个人防护用品",
    "Polishing Materials": "抛光材料",
    "PPF & Wrapping Materials": "PPF和汽车贴膜材料",
    "Squeegees & Scrapers": "刮板和刮刀",
    "Tapes & Adhesives": "胶带和粘合剂",
    "Tools & Blades": "工具和刀片",
    "Window Tinting Materials": "汽车隔热膜材料",
  };

  const productChinese = {
    "10%": "10%",
    "15%": "15%",
    "25%": "25%",
    "35%": "35%",
    "50%": "50%",
    "60%": "60%",
    "70%": "70%",

    "3M Medium Size": "3M中号",
    "3M Small Double Sided Tape": "3M小号双面胶带",

    "AC CLEANER FOAM": "空调清洁泡沫",
    "AC VISUAL CLEANING SET": "空调可视清洁套装",
    "AIR GUN": "气枪",
    "ASPHALT CLEANER": "沥青清洁剂",
    "BLACK COLOR": "黑色",
    "Black Foam": "黑色泡沫",
    "Black Gloves": "黑色手套",
    "BLADE CONTAINER": "刀片容器",
    "Blade Glue Remover for Windshield": "挡风玻璃刀片胶水清除剂",
    "BLUE BIG TOWEL": "蓝色大毛巾",
    "BLUE COLOR": "蓝色",
    "Blue Handle with Small Blades": "蓝色手柄小刀片",
    "BROWN SMALL TOWEL": "棕色小毛巾",
    "Brush Big": "大刷子",
    "CAR CARE FABRIC POLISH": "汽车内饰织物抛光剂",
    "Car Wrap Tool": "汽车贴膜工具",
    "CERAMIC COATING PLASTIC PART": "陶瓷涂层塑料部件",
    "CHROME PARTS REPAIR": "镀铬部件修复剂",
    "Clothe Polish": "织物抛光剂",
    "COLD MIST DISINFECTANT": "冷雾消毒剂",
    "CREAM COLOR": "奶油色",
    "Cutter Blade": "切割刀片",
    "Dark Blue Squeegee": "深蓝色刮板",
    "DESSERT YELLOW COLOR": "甜黄色",
    "Dual Color Squeegee": "双色刮板",
    "Endura Blades": "Endura刀片",
    "ENGINE CLEANER": "发动机清洁剂",
    "ENGINE HARNESS POLISH": "发动机线束抛光剂",
    "FABRIC TOOLS FOR WASH": "织物清洗工具",
    "FOAM BRUSH FOR MAGS": "轮毂泡沫刷",
    "GA Grey Mattings": "GA灰色垫料",
    "GLOSS BLACK": "亮黑色",
    "GLOSSY": "光泽",
    "Gloves Large": "大号手套",
    "Glue Remover Blades": "胶水清除刀片",
    "Green Foam for Polish": "绿色抛光泡沫",
    "Green Long Scraper": "绿色长刮板",
    "Green Rubber Squeegee": "绿色橡胶刮板",
    "Heat Gun": "热风枪",
    "Heavy Cut Compound": "强力研磨剂",
    "INTERIOR CLEANER": "内饰清洁剂",
    "INTERIOR CLEANING AGENT": "内饰清洁剂",
    "JKJ - 019": "JKJ - 019",
    "LEATHER CAR CREAM": "皮革汽车护理霜",
    "MATTE": "哑光",
    "METALIC GREY COLOR": "金属灰色",
    "Mint Green Squeegee": "薄荷绿色刮板",
    "MOSQUITO SELF CLEANING DETERGENT": "蚊虫自清洁洗涤剂",
    "NANO COATING": "纳米涂层",
    "Neon Green Squeegee": "荧光绿色刮板",
    "OIL FILM CLEANER": "油膜清洁剂",
    "OIL SEAL SCREW DRIVER": "油封螺丝刀",
    "OIL TIRE WAX": "油性轮胎蜡",
    "PAINT DEGREASER": "油漆脱脂剂",
    "Paint Protection Film": "漆面保护膜",
    "PALM WAX": "棕榈蜡",
    "Pink Long Scraper": "粉红色长刮板",
    "Pink Squeegee": "粉红色刮板",
    "Plastic WTT Roll": "塑料WTT卷",
    "Polish Agent": "抛光剂",
    "POLISH CUP": "抛光杯",
    "POLISH FOAM": "抛光泡沫",
    "PPF Bag": "PPF袋",
    "PPF Clay": "PPF粘土",
    "PPF Cutter": "PPF切割器",
    "PPF CUTTER GUIDE": "PPF切割导向器",
    "PPF SURFACE": "PPF表面",
    "PPF Tissue Cloth": "PPF纸巾布",
    "PURPLE COLOR": "紫色",
    "PURPLE SMALL TOWEL": "紫色小毛巾",
    "R-G PLASTIC BLADE": "R-G塑料刀片",
    "RACING GREEN COLOR": "赛车绿色",
    "RED COLOR": "红色",
    "Red Flat Squeegee": "红色平刮板",
    "RED SMALL TOWEL": "红色小毛巾",
    "Reducing Agent": "还原剂",
    "REMOVE IRON POWDER": "除铁粉剂",
    "S5-JKJCO34": "S5-JKJCO34",
    "Scraper Green": "绿色刮板",
    "Scraper Red Long": "红色长刮板",
    "Sensor Cutter": "传感器切割器",
    "SIDEMENT LOOSING AGENT": "水泥松解剂",
    "Small Rubber Scraper": "小型橡胶刮板",
    "Spray Bottle": "喷雾瓶",
    "Squeegee Green Rubber": "绿色橡胶刮板",
    "Squeegee WTT Pink Rubber": "WTT粉红色橡胶刮板",
    "SURFACE RENOVATION": "表面翻新剂",
  };

  function bilingualProductName(name) {
    if (!name) return "-";

    const chinese = productChinese[name];

    if (!chinese) {
      return name;
    }

    if (chinese === name) {
      return name;
    }

    return `${name} / ${chinese}`;
  }

  function bilingualCategoryName(name) {
    if (!name) {
      return "No Category / 无类别";
    }

    const chinese = categoryChinese[name];

    if (!chinese) {
      return name;
    }

    return `${name} / ${chinese}`;
  }

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
      return "No Category / 无类别";
    }

    const category = categories.find(
      (item) => String(item.id) === String(categoryId)
    );

    if (!category) {
      return "No Category / 无类别";
    }

    return bilingualCategoryName(category.name);
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
      const searchText = search.trim().toLowerCase();

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

    const {
      data: existingCategory,
      error: findError,
    } = await supabase
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
    if (status === "OUT") {
      return "OUT OF STOCK / 缺货";
    }

    if (status === "LOW") {
      return "LOW STOCK / 库存不足";
    }

    return "IN STOCK / 有库存";
  }

  function statusColor(status) {
    if (status === "OUT") return "#dc2626";
    if (status === "LOW") return "#d4a72c";
    return "#16a34a";
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Inventory / 库存
          </h1>

          <p style={styles.subtitle}>
            Manage products, categories, stock and inventory movements.
            <br />
            管理产品、类别、库存和库存变动。
          </p>
        </div>

        {isAdmin && (
          <div style={styles.headerButtons}>
            <button
              style={styles.secondaryButton}
              onClick={openAddCategory}
            >
              + Add Category / 添加类别
            </button>

            <button
              style={styles.primaryButton}
              onClick={openAddProduct}
            >
              + Add Product / 添加产品
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
          <strong>Error / 错误:</strong> {error}
        </div>
      )}

      <div style={styles.stats}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>
            Products / 产品
          </div>

          <div style={styles.cardValue}>
            {totalProducts}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>
            Low Stock / 库存不足
          </div>

          <div
            style={{
              ...styles.cardValue,
              color: "#d4a72c",
            }}
          >
            {lowStock}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>
            Out of Stock / 缺货
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
              Inventory Value / 库存价值
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
          placeholder="Search by product or SKU / 搜索产品或SKU..."
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
            All Categories / 所有类别
          </option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {bilingualCategoryName(category.name)}
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
            All Status / 所有状态
          </option>

          <option value="OK">
            In Stock / 有库存
          </option>

          <option value="LOW">
            Low Stock / 库存不足
          </option>

          <option value="OUT">
            Out of Stock / 缺货
          </option>
        </select>

        <button
          style={styles.refreshButton}
          onClick={loadData}
        >
          Refresh / 刷新
        </button>
      </div>

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.empty}>
            Loading inventory / 正在加载库存...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={styles.empty}>
            No products match your search.
            <br />
            没有符合搜索条件的产品。
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  SKU
                </th>

                <th style={styles.th}>
                  Product / 产品
                </th>

                <th style={styles.th}>
                  Category / 类别
                </th>

                <th style={styles.th}>
                  Stock / 库存
                </th>

                <th style={styles.th}>
                  Min. / 最低
                </th>

                {isAdmin && (
                  <th style={styles.th}>
                    Cost / 成本
                  </th>
                )}

                <th style={styles.th}>
                  Status / 状态
                </th>

                <th style={styles.th}>
                  Actions / 操作
                </th>
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
                      <strong style={styles.productName}>
                        {bilingualProductName(
                          product.name
                        )}
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
                            style={styles.editButton}
                            onClick={() =>
                              openEditProduct(
                                product
                              )
                            }
                          >
                            Edit / تعديل
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
                          + Stock / إضافة
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
                          - Stock / إزالة
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
                          History / 历史
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
                  Add Category / 添加类别
                </h2>

                <p style={styles.modalSubtitle}>
                  Add a category for this shop.
                  <br />
                  为此店铺添加一个类别。
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
                Category Name / 类别名称 *

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

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() =>
                    setShowCategoryForm(false)
                  }
                >
                  Cancel / 取消
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={saving}
                >
                  {saving
                    ? "Saving... / 保存中..."
                    : "Save Category / 保存类别"}
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
                    ? "Edit Product / 编辑产品"
                    : "Add Product / 添加产品"}
                </h2>

                <p style={styles.modalSubtitle}>
                  {editingProduct
                    ? "Update product information. / 更新产品信息。"
                    : "Add a new inventory item. / 添加新的库存产品。"}
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
                  Product Name / 产品名称 *

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

                  {productForm.name && (
                    <span style={styles.translationPreview}>
                      Chinese / 中文:{" "}
                      {productChinese[
                        productForm.name
                      ] || "Translation can be added in productChinese."}
                    </span>
                  )}
                </label>

                <label style={styles.label}>
                  Category / 类别

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
                        No Category / 无类别
                      </option>

                      {categories.map(
                        (category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {bilingualCategoryName(
                              category.name
                            )}
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
                        + Add / 添加
                      </button>
                    )}
                  </div>
                </label>

                <label style={styles.label}>
                  Unit / 单位

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
                      Pieces / 件
                    </option>

                    <option value="box">
                      Box / 箱
                    </option>

                    <option value="bottle">
                      Bottle / 瓶
                    </option>

                    <option value="liter">
                      Liter / 升
                    </option>

                    <option value="kg">
                      Kilogram / 公斤
                    </option>

                    <option value="roll">
                      Roll / 卷
                    </option>

                    <option value="sack">
                      Sack / 袋
                    </option>

                    <option value="piece">
                      Piece / 件
                    </option>
                  </select>
                </label>

                {isAdmin && (
                  <label style={styles.label}>
                    Cost Price / 成本价 (QAR)

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
                    ? "Current Stock / 当前库存"
                    : "Opening Stock / 初始库存"}

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
                  Minimum Stock / 最低库存

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
                Description / 描述

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
                  Cancel / 取消
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={saving}
                >
                  {saving
                    ? "Saving... / 保存中..."
                    : editingProduct
                    ? "Update Product / 更新产品"
                    : "Save Product / 保存产品"}
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
                  <h2 style={styles.modalTitle}>
                    {movementType === "IN"
                      ? "Stock In / 入库"
                      : "Stock Out / 出库"}
                  </h2>

                  <p
                    style={{
                      ...styles.modalSubtitle,
                      fontWeight: "700",
                      color: "#111827",
                    }}
                  >
                    {bilingualProductName(
                      selectedProduct.name
                    )}
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
                Current Stock / 当前库存:{" "}
                <strong>
                  {selectedProduct.current_stock}{" "}
                  {selectedProduct.unit}
                </strong>
              </div>

              <form onSubmit={saveMovement}>
                <label style={styles.label}>
                  Quantity / 数量 *

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
                    Unit Cost / 单位成本 (QAR)

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
                  Reference / 参考

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
                  Notes / 备注

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
                    Cancel / 取消
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
                      ? "Saving... / 保存中..."
                      : movementType === "IN"
                      ? "Add Stock / 添加库存"
                      : "Remove Stock / 移除库存"}
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
                  {bilingualProductName(
                    selectedProduct.name
                  )}
                </h2>

                <p style={styles.modalSubtitle}>
                  Stock movement history / 库存变动历史
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
              Current Stock / 当前库存:{" "}
              <strong>
                {selectedProduct.current_stock}{" "}
                {selectedProduct.unit}
              </strong>
            </div>

            {historyLoading ? (
              <div style={styles.empty}>
                Loading history / 正在加载历史记录...
              </div>
            ) : history.length === 0 ? (
              <div style={styles.empty}>
                No stock movements recorded yet.
                <br />
                尚未记录库存变动。
              </div>
            ) : (
              <div style={styles.historyTable}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>
                        Date / 日期
                      </th>

                      <th style={styles.th}>
                        Type / 类型
                      </th>

                      <th style={styles.th}>
                        Quantity / 数量
                      </th>

                      <th style={styles.th}>
                        Reference / 参考
                      </th>

                      <th style={styles.th}>
                        Notes / 备注
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
                            {movement.movement_type ===
                            "IN"
                              ? "IN / 入库"
                              : "OUT / 出库"}
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
    padding: "30px",
    maxWidth: "1500px",
    margin: "0 auto",
    background: "#f8f7f2",
    minHeight: "100vh",
    color: "#111827",
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
    fontWeight: "800",
    color: "#111111",
  },

  subtitle: {
    marginTop: "7px",
    color: "#6b7280",
    lineHeight: "1.6",
  },

  primaryButton: {
    border: "1px solid #c8a951",
    background: "#111111",
    color: "#d4af37",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  secondaryButton: {
    border: "1px solid #c8a951",
    background: "white",
    color: "#111111",
    padding: "10px 17px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  addSmallButton: {
    border: "none",
    background: "#111111",
    color: "#d4af37",
    padding: "10px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  editButton: {
    border: "1px solid #c8a951",
    background: "#fffaf0",
    color: "#8a6d1d",
    padding: "6px 9px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "700",
  },

  inPrimaryButton: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  outPrimaryButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  refreshButton: {
    border: "1px solid #c8a951",
    background: "#111111",
    color: "#d4af37",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
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
    border: "1px solid #e5d7a5",
    borderRadius: "12px",
    padding: "20px",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.04)",
  },

  cardLabel: {
    color: "#6b7280",
    fontSize: "14px",
    fontWeight: "600",
  },

  cardValue: {
    fontSize: "27px",
    fontWeight: "800",
    marginTop: "8px",
    color: "#111111",
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
    background: "white",
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
    border: "1px solid #e5d7a5",
    borderRadius: "12px",
    overflowX: "auto",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.04)",
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
    padding: "13px",
    background: "#111111",
    color: "#d4af37",
    borderBottom: "2px solid #c8a951",
    fontSize: "13px",
    whiteSpace: "nowrap",
    fontWeight: "700",
  },

  td: {
    padding: "13px",
    borderBottom: "1px solid #f0ead5",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  productName: {
    fontWeight: "800",
    color: "#111111",
  },

  translationPreview: {
    fontSize: "12px",
    color: "#8a6d1d",
    fontWeight: "500",
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
    border: "1px solid #d1d5db",
    background: "#f3f4f6",
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
    lineHeight: "1.7",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
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
      "0 20px 50px rgba(0,0,0,0.35)",
    border: "1px solid #d4af37",
  },

  smallModal: {
    background: "white",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "450px",
    padding: "25px",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.35)",
    border: "1px solid #d4af37",
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
    fontWeight: "800",
    color: "#111111",
  },

  modalSubtitle: {
    color: "#6b7280",
    marginTop: "5px",
    lineHeight: "1.5",
  },

  closeButton: {
    border: "1px solid #d4af37",
    background: "#111111",
    color: "#d4af37",
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
    fontWeight: "700",
    marginBottom: "15px",
    color: "#111827",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "400",
    background: "white",
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
    fontWeight: "600",
  },

  stockInfo: {
    background: "#fffaf0",
    border: "1px solid #e5d7a5",
    padding: "13px",
    borderRadius: "8px",
    marginBottom: "18px",
  },

  historyPanel: {
    marginTop: "25px",
    background: "white",
    border: "1px solid #e5d7a5",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.04)",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px",
    borderBottom: "1px solid #e5d7a5",
  },

  historyTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
  },
};

export default Inventory;