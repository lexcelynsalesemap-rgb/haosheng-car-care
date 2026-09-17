import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";
import { canSeeInventoryCost } from "../utils/permissions";

/* =========================================================
   CHINESE TRANSLATIONS
========================================================= */

const categoryChinese = {
  PPF: "漆面保护膜",
  "Color PPF / PET": "彩色PPF / PET",
  "Window Tinting": "车窗贴膜",
  Tools: "工具",
  "Carwash Tools": "洗车工具",
  Chemicals: "化学品",
};
const ALLOWED_CATEGORIES = [
  {
    name: "PPF",
    chinese: "漆面保护膜",
  },
  {
    name: "Color PPF / PET",
    chinese: "彩色PPF / PET",
  },
  {
    name: "Window Tinting",
    chinese: "车窗贴膜",
  },
  {
    name: "Tools",
    chinese: "工具",
  },
  {
    name: "Carwash Tools",
    chinese: "洗车工具",
  },
  {
    name: "Chemicals",
    chinese: "化学品",
  },
];
const productChinese = {
  "Paint Protection Film": "漆面保护膜",
  "Full Body PPF": "全车漆面保护膜",
  "Front PPF": "前部漆面保护膜",
  "Matte PPF": "哑光漆面保护膜",
  "Glossy PPF": "高光漆面保护膜",

  "Color PPF": "彩色漆面保护膜",
  "Color PPF / PET": "彩色PPF / PET",
  PET: "PET膜",

  "Window Film": "车窗膜",
  "Window Tinting": "车窗贴膜",

  "Ceramic Coating": "陶瓷涂层",

  Tools: "工具",
  "Carwash Tools": "洗车工具",
  Chemicals: "化学品",

  "Car Wash": "洗车",
  "Oil Change": "更换机油",
  "Engine Oil": "发动机油",
  "Brake Pads": "刹车片",
  "Air Filter": "空气滤清器",
  "Cabin Filter": "空调滤芯",
  Wiper: "雨刷",
  "Car Accessories": "汽车配件",
};
function getProductChinese(name = "", categoryName = "") {
  const exact = productChinese[name];

  if (exact) return exact;

  const lower = name.toLowerCase();

  if (lower.includes("engine oil")) return "发动机油";
  if (lower.includes("brake pad")) return "刹车片";
  if (lower.includes("air filter")) return "空气滤清器";
  if (lower.includes("cabin filter")) return "空调滤芯";
  if (lower.includes("wiper")) return "雨刷";
  if (lower.includes("matte") && lower.includes("ppf"))
    return "哑光漆面保护膜";
  if (lower.includes("gloss") && lower.includes("ppf"))
    return "高光漆面保护膜";
  if (lower.includes("ppf")) return "漆面保护膜";
  if (lower.includes("window film")) return "车窗膜";
  if (lower.includes("window tint")) return "车窗贴膜";
  if (lower.includes("ceramic")) return "陶瓷涂层";
  if (lower.includes("car wash")) return "洗车";
  if (lower.includes("oil change")) return "更换机油";
  if (lower.includes("accessor")) return "汽车配件";

  return categoryChinese[categoryName] || "其他";
}

function getProductDisplay(name = "", categoryName = "") {
  const chinese = getProductChinese(name, categoryName);

  return (
    <div className="product-name-wrapper">
      <div className="product-name-en">{name || "—"}</div>
      {chinese && (
        <div className="product-name-cn">{chinese}</div>
      )}
    </div>
  );
}

function getCategoryDisplay(name = "") {
  const chinese = categoryChinese[name] || "其他";

  return (
    <div className="category-name-wrapper">
      <div>{name || "—"}</div>
      <div className="category-cn">{chinese}</div>
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function getStatus(product) {
  const stock = Number(product.current_stock || 0);
  const minimum = Number(product.minimum_stock || 0);

  if (stock <= 0) {
    return {
      key: "out",
      label: "Out of Stock",
      chinese: "缺货",
      className: "status-out",
    };
  }

  if (stock <= minimum) {
    return {
      key: "low",
      label: "Low Stock",
      chinese: "库存不足",
      className: "status-low",
    };
  }

  return {
    key: "in",
    label: "In Stock",
    chinese: "库存充足",
    className: "status-in",
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Inventory() {
  /* =======================================================
     USER / PERMISSIONS
  ======================================================= */

  const loggedInUser = useMemo(() => {
    try {
      const stored =
        localStorage.getItem("loggedInUser") ||
        localStorage.getItem("user");

      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const isAdmin =
    loggedInUser?.role === "admin" ||
    loggedInUser?.role === "Admin" ||
    loggedInUser?.is_admin === true ||
    loggedInUser?.isAdmin === true;

 const userName =
  loggedInUser?.name ||
  loggedInUser?.full_name ||
  loggedInUser?.username ||
  loggedInUser?.user_name ||
  "";


const normalizedUserName = String(userName || "")
  .trim()
  .toLowerCase();

const canManageStock =
  isAdmin ||
  normalizedUserName.includes("daniel") ||
  normalizedUserName === "shop 1 staff";

  const showCost = canSeeInventoryCost(loggedInUser);

  const shopId =
    loggedInUser?.shop_id ||
    loggedInUser?.shopId ||
    loggedInUser?.shop?.id ||
    null;

  /* =======================================================
     DATA
  ======================================================= */

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* =======================================================
     FILTERS
  ======================================================= */

const [search, setSearch] = useState("");
const [categoryFilter, setCategoryFilter] = useState("all");
const [statusFilter, setStatusFilter] = useState("all");
const [stockFilter, setStockFilter] = useState("all");
  /* =======================================================
     MODALS
  ======================================================= */

  const [showProductForm, setShowProductForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  /* =======================================================
     PRODUCT
  ======================================================= */

  const [editingProduct, setEditingProduct] = useState(null);

  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    category_id: "",
    unit: "pcs",
    cost_price: "",
    current_stock: "",
    minimum_stock: "",
    description: "",
    image_url: "",
  });

  /* =======================================================
     IMAGE
  ======================================================= */

  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  /* =======================================================
     LARGE IMAGE VIEWER
  ======================================================= */

  const [selectedImage, setSelectedImage] = useState(null);

  function openImageViewer(url, name) {
    if (!url) return;

    setSelectedImage({
      url,
      name: name || "Product Image",
    });
  }

  function closeImageViewer() {
    setSelectedImage(null);
  }

  /* =======================================================
     MOVEMENT
  ======================================================= */

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movementType, setMovementType] =
  useState("IN");

  const [movementForm, setMovementForm] = useState({
    quantity: "",
    unit_cost: "",
    reference: "",
    notes: "",
  });

  /* =======================================================
     HISTORY
  ======================================================= */

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* =======================================================
     CATEGORY
  ======================================================= */

  const [categoryName, setCategoryName] = useState("");

  /* =======================================================
     CLEANUP IMAGE PREVIEW
  ======================================================= */

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    if (!shopId) {
      setLoading(false);
      setError("No shop is assigned to your account.");
      return;
    }

    loadProducts();
    loadCategories();
  }, [shopId]);

  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  async function loadProducts() {
    if (!shopId) return;

    try {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
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
          shop_id,
          image_url
        `)
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("name", { ascending: true });

      if (queryError) {
        throw queryError;
      }

      setProducts(data || []);
    } catch (err) {
      console.error("loadProducts error:", err);
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     LOAD CATEGORIES
  ======================================================= */

  async function loadCategories() {
  if (!shopId) return;

  try {
    const { data, error: queryError } = await supabase
      .from("inventory_categories")
      .select("*")
      .eq("shop_id", shopId)
      .eq("active", true)
      .order("name", { ascending: true });

    if (queryError) {
      throw queryError;
    }

    /*
     * ONLY SHOW THE SIX APPROVED CATEGORIES
     */
    const allowedNames = ALLOWED_CATEGORIES.map(
      (category) => category.name.toLowerCase()
    );

    const filteredCategories = (data || []).filter(
      (category) =>
        allowedNames.includes(
          String(category.name || "")
            .trim()
            .toLowerCase()
        )
    );

    /*
     * Sort according to our preferred order
     */
    filteredCategories.sort((a, b) => {
      const aIndex = ALLOWED_CATEGORIES.findIndex(
        (item) =>
          item.name.toLowerCase() ===
          String(a.name || "").trim().toLowerCase()
      );

      const bIndex = ALLOWED_CATEGORIES.findIndex(
        (item) =>
          item.name.toLowerCase() ===
          String(b.name || "").trim().toLowerCase()
      );

      return aIndex - bIndex;
    });

    setCategories(filteredCategories);
  } catch (err) {
    console.error("loadCategories error:", err);
    setError(
      err.message || "Failed to load categories."
    );
  }
}
  /* =========================================================
   FILTERED PRODUCTS
========================================================= */

const filteredProducts = useMemo(() => {
  return products.filter((product) => {
    /*
    ============================================================
    CATEGORY FILTER
    ============================================================
    */

    const matchesCategory =
      categoryFilter === "all" ||
      String(product.category_id || "") ===
        String(categoryFilter || "");

    /*
    ============================================================
    SEARCH FILTER
    ============================================================
    */

    const searchValue = String(search || "")
      .trim()
      .toLowerCase();

    const matchesSearch =
      !searchValue ||
      String(product.sku || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(product.name || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(product.description || "")
        .toLowerCase()
        .includes(searchValue);

    /*
    ============================================================
    STOCK FILTER
    ============================================================
    */

    const stockValue = Number(product.current_stock || 0);
    const minimumStock = Number(product.minimum_stock || 0);

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in-stock" &&
        stockValue > minimumStock) ||
      (stockFilter === "low-stock" &&
        stockValue > 0 &&
        stockValue <= minimumStock) ||
      (stockFilter === "out-of-stock" &&
        stockValue <= 0);
const productStatus =
  getStatus(product).key;

const matchesStatus =
  statusFilter === "all" ||
  productStatus === statusFilter;
    /*
    ============================================================
    FINAL RESULT
    ============================================================
    */

   return (
  matchesCategory &&
  matchesSearch &&
  matchesStock &&
  matchesStatus
);
  });
}, [
  products,
  categoryFilter,
  search,
  stockFilter,
  statusFilter,
]);
  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    const totalProducts = products.length;

    const totalUnits = products.reduce(
      (sum, product) =>
        sum + Number(product.current_stock || 0),
      0
    );

    const lowStock = products.filter(
      (product) => getStatus(product).key === "low"
    ).length;

    const outOfStock = products.filter(
      (product) => getStatus(product).key === "out"
    ).length;

    const inventoryValue = products.reduce(
      (sum, product) =>
        sum +
        Number(product.current_stock || 0) *
          Number(product.cost_price || 0),
      0
    );

    return {
      totalProducts,
      totalUnits,
      lowStock,
      outOfStock,
      inventoryValue,
    };
  }, [products]);

  /* =======================================================
     FORMAT MONEY
  ======================================================= */

  function formatMoney(value) {
    return `QAR ${Number(value || 0).toLocaleString(
      "en-QA",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  /* =======================================================
     PRODUCT FORM
  ======================================================= */

  function openAddProduct() {
    setError("");
    setMessage("");
    setEditingProduct(null);

    setProductForm({
      sku: "",
      name: "",
      category_id: categories[0]?.id || "",
      unit: "pcs",
      cost_price: "",
      current_stock: "",
      minimum_stock: "",
      description: "",
      image_url: "",
    });

    setProductImage(null);

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview("");
    setShowProductForm(true);
  }

  function openEditProduct(product) {
    setError("");
    setMessage("");

    setEditingProduct(product);

    setProductForm({
      sku: product.sku || "",
      name: product.name || "",
      category_id: product.category_id || "",
      unit: product.unit || "pcs",
      cost_price:
        product.cost_price !== null &&
        product.cost_price !== undefined
          ? product.cost_price
          : "",
      current_stock:
        product.current_stock !== null &&
        product.current_stock !== undefined
          ? product.current_stock
          : "",
      minimum_stock:
        product.minimum_stock !== null &&
        product.minimum_stock !== undefined
          ? product.minimum_stock
          : "",
      description: product.description || "",
      image_url: product.image_url || "",
    });

    setProductImage(null);

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(product.image_url || "");
    setShowProductForm(true);
  }

  function closeProductForm() {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview("");
    setProductImage(null);
    setEditingProduct(null);
    setShowProductForm(false);
  }

  function handleProductFormChange(event) {
    const { name, value } = event.target;

    setProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  /* =======================================================
     IMAGE SELECTION
  ======================================================= */

  function handleProductImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setProductImage(file);
    setImagePreview(previewUrl);

    event.target.value = "";
  }

  function removeProductImage() {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setProductImage(null);
    setImagePreview("");

    setProductForm((prev) => ({
      ...prev,
      image_url: "",
    }));
  }

  /* =======================================================
     UPLOAD PRODUCT IMAGE
  ======================================================= */

  async function uploadProductImage(file, sku) {
    if (!file) {
      return productForm.image_url || null;
    }

    if (!shopId) {
      throw new Error(
        "No shop ID was found. Cannot upload the image."
      );
    }

    setUploadingImage(true);

    try {
      const originalExtension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const extension =
        originalExtension.replace(/[^a-z0-9]/g, "") || "jpg";

      const safeSku =
        String(sku || "product")
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 80) || "product";

      const filePath =
        `${shopId}/${safeSku}-${Date.now()}.${extension}`;

      console.log("Uploading product image:", {
        bucket: "inventory-images",
        filePath,
        sku,
        shopId,
      });

      const { error: uploadError } =
        await supabase.storage
          .from("inventory-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

      if (uploadError) {
        console.error(
          "Product image upload error:",
          uploadError
        );

        if (
          uploadError.message
            ?.toLowerCase()
            .includes("row-level security")
        ) {
          throw new Error(
            "Image upload was blocked by Supabase Storage RLS. The inventory-images bucket needs an INSERT policy."
          );
        }

        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("inventory-images")
        .getPublicUrl(filePath);

      const publicUrl =
        publicUrlData?.publicUrl?.trim() || "";

      console.log("Generated image public URL:", publicUrl);

      if (!publicUrl) {
        throw new Error(
          "Image uploaded, but no public URL was generated."
        );
      }

      /*
       * IMPORTANT:
       * Keep the URL in React state too.
       */
      setProductForm((prev) => ({
        ...prev,
        image_url: publicUrl,
      }));

      return publicUrl;
    } finally {
      setUploadingImage(false);
    }
  }

  /* =======================================================
     FIND INSERTED PRODUCT WITHOUT .SINGLE()
  ======================================================= */

  async function findProductBySku(sku) {
    const { data, error: findError } = await supabase
      .from("inventory_products")
      .select("id, sku, shop_id, image_url")
      .eq("shop_id", shopId)
      .eq("sku", sku)
      .order("created_at", { ascending: false })
      .limit(1);

    if (findError) {
      throw findError;
    }

    return data?.[0] || null;
  }

  /* =======================================================
     EXPLICITLY SAVE IMAGE URL
     
     This is the important fix.
  ======================================================= */

  async function saveImageUrlToProduct(productId, imageUrl) {
    if (!productId) {
      throw new Error(
        "Product was created, but its database ID could not be found."
      );
    }

    if (!imageUrl) {
      return;
    }

    console.log("Saving image_url to product:", {
      productId,
      imageUrl,
    });

    const { error: imageUpdateError } = await supabase
      .from("inventory_products")
      .update({
        image_url: imageUrl,
      })
      .eq("id", productId)
      .eq("shop_id", shopId);

    if (imageUpdateError) {
      console.error(
        "image_url database update error:",
        imageUpdateError
      );

      if (
        imageUpdateError.message
          ?.toLowerCase()
          .includes("row-level security")
      ) {
        throw new Error(
          "The image uploaded successfully, but Supabase blocked saving image_url. Check the UPDATE policy for inventory_products."
        );
      }

      throw imageUpdateError;
    }

    /*
     * Verify that the URL actually exists in the database.
     */
    const { data: verifyData, error: verifyError } =
      await supabase
        .from("inventory_products")
        .select("id, image_url")
        .eq("id", productId)
        .eq("shop_id", shopId)
        .limit(1);

    if (verifyError) {
      console.warn(
        "Could not verify image_url:",
        verifyError
      );
      return;
    }

    const savedUrl = verifyData?.[0]?.image_url || "";

    console.log("Verified image_url:", savedUrl);

    if (!savedUrl) {
      throw new Error(
        "The image uploaded successfully, but image_url is still empty in inventory_products."
      );
    }
  }

  /* =======================================================
     SAVE PRODUCT
  ======================================================= */

  async function saveProduct(e) {
  e.preventDefault();

  if (!isAdmin) {
    setError("You do not have permission to save products.");
    return;
  }

  if (!shopId) {
    setError("No shop ID was found.");
    return;
  }

  const sku = String(productForm.sku || "").trim();
  const name = String(productForm.name || "").trim();

  if (!sku) {
    setError("Please enter the SKU.");
    return;
  }

  if (!name) {
    setError("Please enter the product name.");
    return;
  }

  if (!productForm.category_id) {
    setError("Please select a category.");
    return;
  }

  const costPrice = Number(productForm.cost_price || 0);
  const currentStock = Number(productForm.current_stock || 0);
  const minimumStock = Number(productForm.minimum_stock || 0);

  if (Number.isNaN(costPrice) || costPrice < 0) {
    setError("Please enter a valid cost price.");
    return;
  }

  if (Number.isNaN(currentStock) || currentStock < 0) {
    setError("Please enter a valid current stock.");
    return;
  }

  if (Number.isNaN(minimumStock) || minimumStock < 0) {
    setError("Please enter a valid minimum stock.");
    return;
  }

  setSaving(true);
  setError("");
  setMessage("");

  try {
    /*
    ============================================================
    1. START WITH EXISTING IMAGE URL
    ============================================================
    */

    let imageUrl =
      String(productForm.image_url || "").trim() || null;

    /*
    ============================================================
    2. IF USER SELECTED A NEW IMAGE, UPLOAD IT FIRST
    ============================================================
    */

    if (productImage) {
      imageUrl = await uploadProductImage(productImage, sku);

      if (!imageUrl) {
        throw new Error(
          "The image uploaded, but no public image URL was returned."
        );
      }

      console.log(
        "IMAGE UPLOAD SUCCESS - PUBLIC URL:",
        imageUrl
      );

      // Keep the URL in React state too.
      setProductForm((prev) => ({
        ...prev,
        image_url: imageUrl,
      }));
    }

    /*
    ============================================================
    3. PRODUCT DATA
    ============================================================
    */

    const productData = {
      shop_id: shopId,
      sku,
      name,
      category_id: productForm.category_id,
      unit: productForm.unit || "pcs",
      cost_price: costPrice,
      current_stock: currentStock,
      minimum_stock: minimumStock,
      description:
        String(productForm.description || "").trim() || null,
      image_url: imageUrl,
      active: true,
    };

    console.log(
      "PRODUCT DATA BEING SAVED:",
      productData
    );

    /*
    ============================================================
    4. UPDATE EXISTING PRODUCT
    ============================================================
    */

    if (editingProduct?.id) {
      const { error: updateError } = await supabase
        .from("inventory_products")
        .update(productData)
        .eq("id", editingProduct.id)
        .eq("shop_id", shopId);

      if (updateError) {
        console.error(
          "PRODUCT UPDATE ERROR:",
          updateError
        );

        throw new Error(
          `Could not update product: ${updateError.message}`
        );
      }

      /*
      ==========================================================
      EXPLICITLY SAVE IMAGE URL AGAIN
      ==========================================================
      */

      if (imageUrl) {
        const { error: imageUpdateError } =
          await supabase
            .from("inventory_products")
            .update({
              image_url: imageUrl,
            })
            .eq("id", editingProduct.id)
            .eq("shop_id", shopId);

        if (imageUpdateError) {
          console.error(
            "IMAGE URL UPDATE ERROR:",
            imageUpdateError
          );

          throw new Error(
            `Product saved, but image_url could not be saved: ${imageUpdateError.message}`
          );
        }
      }

      /*
      ==========================================================
      VERIFY THE DATABASE VALUE
      ==========================================================
      */

      const {
        data: verifyRows,
        error: verifyError,
      } = await supabase
        .from("inventory_products")
        .select("id, sku, image_url")
        .eq("id", editingProduct.id)
        .eq("shop_id", shopId)
        .limit(1);

      if (verifyError) {
        console.error(
          "IMAGE URL VERIFY ERROR:",
          verifyError
        );

        throw new Error(
          `Product saved, but verification failed: ${verifyError.message}`
        );
      }

      const savedProduct = verifyRows?.[0];

      console.log(
        "DATABASE PRODUCT AFTER SAVE:",
        savedProduct
      );

      if (
        imageUrl &&
        savedProduct?.image_url !== imageUrl
      ) {
        throw new Error(
          "The image uploaded successfully, but Supabase did not retain image_url in inventory_products. Please check the UPDATE RLS policy or a database trigger on inventory_products."
        );
      }

      setMessage(
        imageUrl
          ? "Product updated successfully with image."
          : "Product updated successfully."
      );
    }

    /*
    ============================================================
    5. INSERT NEW PRODUCT
    ============================================================
    */

    else {
      const { error: insertError } = await supabase
        .from("inventory_products")
        .insert(productData);

      if (insertError) {
        console.error(
          "PRODUCT INSERT ERROR:",
          insertError
        );

        throw new Error(
          `Could not create product: ${insertError.message}`
        );
      }

      /*
      ==========================================================
      FIND THE NEWLY CREATED PRODUCT
      ==========================================================
      
      We intentionally DO NOT use .single().
      This avoids the previous:
      
      "Cannot coerce the result to a single JSON object"
      ==========================================================
      */

      const {
        data: insertedRows,
        error: findInsertedError,
      } = await supabase
        .from("inventory_products")
        .select("id, sku, image_url, created_at")
        .eq("shop_id", shopId)
        .eq("sku", sku)
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (findInsertedError) {
        console.error(
          "FIND INSERTED PRODUCT ERROR:",
          findInsertedError
        );

        throw new Error(
          `Product was created, but could not be found afterward: ${findInsertedError.message}`
        );
      }

      const insertedProduct =
        insertedRows?.[0];

      if (!insertedProduct?.id) {
        throw new Error(
          "Product was created, but I could not find its database row afterward."
        );
      }

      console.log(
        "INSERTED PRODUCT:",
        insertedProduct
      );

      /*
      ==========================================================
      6. EXPLICIT IMAGE URL UPDATE FOR NEW PRODUCT
      ==========================================================
      */

      if (imageUrl) {
        const {
          error: imageUpdateError,
        } = await supabase
          .from("inventory_products")
          .update({
            image_url: imageUrl,
          })
          .eq("id", insertedProduct.id)
          .eq("shop_id", shopId);

        if (imageUpdateError) {
          console.error(
            "NEW PRODUCT IMAGE UPDATE ERROR:",
            imageUpdateError
          );

          throw new Error(
            `Product was created and image uploaded, but image_url could not be saved: ${imageUpdateError.message}`
          );
        }

        /*
        ========================================================
        7. VERIFY IMAGE URL AFTER EXPLICIT UPDATE
        ========================================================
        */

        const {
          data: verifyRows,
          error: verifyError,
        } = await supabase
          .from("inventory_products")
          .select("id, sku, image_url")
          .eq("id", insertedProduct.id)
          .eq("shop_id", shopId)
          .limit(1);

        if (verifyError) {
          console.error(
            "NEW PRODUCT VERIFY ERROR:",
            verifyError
          );

          throw new Error(
            `Product was created, but image verification failed: ${verifyError.message}`
          );
        }

        const verifiedProduct =
          verifyRows?.[0];

        console.log(
          "VERIFIED PRODUCT:",
          verifiedProduct
        );

        if (
          verifiedProduct?.image_url !== imageUrl
        ) {
          throw new Error(
            "The image uploaded successfully, but inventory_products.image_url is still empty after the database update. This strongly indicates an UPDATE RLS policy or database trigger is preventing the value from being retained."
          );
        }
      }

      setMessage(
        imageUrl
          ? "Product created successfully with image."
          : "Product created successfully."
      );
    }

    /*
    ============================================================
    8. REFRESH PRODUCTS
    ============================================================
    */

    await loadProducts();

    /*
    ============================================================
    9. CLOSE FORM
    ============================================================
    */

    closeProductForm();

  } catch (err) {
    console.error(
      "SAVE PRODUCT FINAL ERROR:",
      err
    );

    setError(
      err?.message ||
        "Something went wrong while saving the product."
    );
  } finally {
    setSaving(false);
    setUploadingImage(false);
  }
}

 /* =======================================================
   CATEGORY MANAGEMENT
======================================================= */

function openAddCategory() {
  setCategoryName("");
  setError("");
  setMessage("");
  setShowCategoryForm(true);
}

function closeCategoryForm() {
  setCategoryName("");
  setShowCategoryForm(false);
}

/*
 * Categories that are not currently active
 */
const availableCategoriesToAdd =
  ALLOWED_CATEGORIES.filter(
    (allowedCategory) =>
      !categories.some(
        (category) =>
          String(category.name || "")
            .trim()
            .toLowerCase() ===
          allowedCategory.name.toLowerCase()
      )
  );

/*
 * ADD CATEGORY
 */
async function saveCategory(event) {
  event.preventDefault();

  if (!isAdmin) {
    setError(
      "Only administrators can manage categories."
    );
    return;
  }

  if (!shopId) {
    setError(
      "No shop is assigned to your account."
    );
    return;
  }

  const name = String(categoryName || "").trim();

  if (!name) {
    setError("Please select a category.");
    return;
  }

  const allowedCategory =
    ALLOWED_CATEGORIES.find(
      (category) =>
        category.name.toLowerCase() ===
        name.toLowerCase()
    );

  if (!allowedCategory) {
    setError(
      "This category is not available."
    );
    return;
  }

  const alreadyExists = categories.some(
    (category) =>
      String(category.name || "")
        .trim()
        .toLowerCase() ===
      allowedCategory.name.toLowerCase()
  );

  if (alreadyExists) {
    setError(
      "This category is already active."
    );
    return;
  }

  setSaving(true);
  setError("");
  setMessage("");

  try {
    /*
     * Check whether an old inactive row already exists.
     */
    const {
      data: existingRows,
      error: existingError,
    } = await supabase
      .from("inventory_categories")
      .select("id, name, active")
      .eq("shop_id", shopId)
      .ilike("name", allowedCategory.name)
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    const existing =
      existingRows?.[0] || null;

    /*
     * REACTIVATE OLD CATEGORY
     */
    if (existing?.id) {
      const {
        error: updateError,
      } = await supabase
        .from("inventory_categories")
        .update({
          active: true,
        })
        .eq("id", existing.id)
        .eq("shop_id", shopId);

      if (updateError) {
        console.error(
          "Category reactivation error:",
          updateError
        );

        throw updateError;
      }
    }

    /*
     * CREATE NEW CATEGORY
     */
    else {
      const {
        error: insertError,
      } = await supabase
        .from("inventory_categories")
        .insert({
          name: allowedCategory.name,
          shop_id: shopId,
          active: true,
        });

      if (insertError) {
        console.error(
          "Category insert error:",
          insertError
        );

        if (
          insertError.message
            ?.toLowerCase()
            .includes("row-level security")
        ) {
          throw new Error(
            "Category creation was blocked by Supabase RLS. Check the INSERT policy for inventory_categories."
          );
        }

        throw insertError;
      }
    }

    await loadCategories();

    closeCategoryForm();

    setMessage(
      `${allowedCategory.name} added successfully. ${allowedCategory.chinese} 分类添加成功。`
    );
  } catch (err) {
    console.error(
      "saveCategory error:",
      err
    );

    setError(
      err.message ||
        "Failed to add category."
    );
  } finally {
    setSaving(false);
  }
}

/*
 * REMOVE CATEGORY
 */
async function removeCategory(category) {
  if (!isAdmin) {
    setError(
      "Only administrators can remove categories."
    );
    return;
  }

  if (!category?.id || !shopId) {
    setError(
      "Category or shop information is missing."
    );
    return;
  }

  /*
   * Check if products are using this category.
   */
  const {
    data: productsUsingCategory,
    error: productCheckError,
  } = await supabase
    .from("inventory_products")
    .select("id, name, sku")
    .eq("shop_id", shopId)
    .eq("category_id", category.id)
    .eq("active", true)
    .limit(10);

  if (productCheckError) {
    console.error(
      "Category product check error:",
      productCheckError
    );

    setError(
      productCheckError.message ||
        "Could not check products using this category."
    );

    return;
  }

  if (
    productsUsingCategory &&
    productsUsingCategory.length > 0
  ) {
    const productNames =
      productsUsingCategory
        .slice(0, 5)
        .map(
          (product) =>
            `${product.name || "Unnamed"} (${product.sku || "No SKU"})`
        )
        .join("\n");

    const more =
      productsUsingCategory.length > 5
        ? `\n...and ${
            productsUsingCategory.length - 5
          } more.`
        : "";

    setError(
      `Cannot remove "${category.name}" because products are still assigned to it.\n\n${productNames}${more}\n\nPlease move these products to another category first.`
    );

    return;
  }

  const confirmed = window.confirm(
    `Remove "${category.name}" / ${
      categoryChinese[category.name] || ""
    }?\n\nThe category will be hidden from the active category list.`
  );

  if (!confirmed) return;

  setSaving(true);
  setError("");
  setMessage("");

  try {
    const {
      error: updateError,
    } = await supabase
      .from("inventory_categories")
      .update({
        active: false,
      })
      .eq("id", category.id)
      .eq("shop_id", shopId);

    if (updateError) {
      console.error(
        "REMOVE CATEGORY ERROR:",
        updateError
      );

      if (
        updateError.message
          ?.toLowerCase()
          .includes("row-level security")
      ) {
        throw new Error(
          "Category removal was blocked by Supabase RLS. Check the UPDATE policy for inventory_categories."
        );
      }

      throw updateError;
    }

    await loadCategories();

    /*
     * If the removed category was selected in the filter,
     * reset the filter.
     */
    if (
      String(categoryFilter) ===
      String(category.id)
    ) {
      setCategoryFilter("all");
    }

    /*
     * If it was selected in the product form,
     * select the first remaining category.
     */
    if (
      String(productForm.category_id) ===
      String(category.id)
    ) {
      setProductForm((prev) => ({
        ...prev,
        category_id:
          categories.find(
            (item) =>
              String(item.id) !==
              String(category.id)
          )?.id || "",
      }));
    }

    setMessage(
      `"${category.name}" removed successfully. 分类已删除。`
    );
  } catch (err) {
    console.error(
      "removeCategory error:",
      err
    );

    setError(
      err.message ||
        "Failed to remove category."
    );
  } finally {
    setSaving(false);
  }
}
  /* =======================================================
     MOVEMENT
  ======================================================= */

function openMovement(product, type = "IN") {
  setSelectedProduct(product);
  setMovementType(
    String(type).toUpperCase()
  );

    setMovementForm({
      quantity: "",
      unit_cost:
        product.cost_price !== null &&
        product.cost_price !== undefined
          ? product.cost_price
          : "",
      reference: "",
      notes: "",
    });

    setError("");
    setMessage("");
    setShowMovementForm(true);
  }

  function closeMovementForm() {
    setSelectedProduct(null);
    setShowMovementForm(false);
  }

  function handleMovementFormChange(event) {
    const { name, value } = event.target;

    setMovementForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function saveMovement(event) {
  event.preventDefault();

  if (!canManageStock) {
    setError("You do not have permission to manage stock.");
    return;
  }

  if (!shopId) {
    setError("No shop is assigned to your account.");
    return;
  }

  if (!selectedProduct?.id) {
    setError("No product selected.");
    return;
  }

  const quantity = Number(movementForm.quantity);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    setError("Quantity must be greater than zero.");
    return;
  }

  const unitCost =
    movementForm.unit_cost === ""
      ? 0
      : Number(movementForm.unit_cost);

  if (!Number.isFinite(unitCost) || unitCost < 0) {
    setError("Unit cost must be a valid number.");
    return;
  }

  const movement =
    String(movementType || "").trim().toUpperCase();

  if (!["IN", "OUT", "ADJUSTMENT"].includes(movement)) {
    setError(`Invalid movement type: ${movement}`);
    return;
  }

  setSaving(true);
  setError("");
  setMessage("");

  try {
    console.log("=== SAVING INVENTORY MOVEMENT ===");
    console.log("Product ID:", selectedProduct.id);
    console.log("Movement:", movement);
    console.log("Quantity:", quantity);
    console.log("Unit Cost:", unitCost);
    console.log("Shop ID:", shopId);

    const rpcParams = {
      p_product_id: selectedProduct.id,
      p_movement_type: movement,
      p_quantity: quantity,
      p_unit_cost: unitCost,
      p_supplier_id: null,
      p_job_id: null,
      p_user_id: null,
      p_reference:
        movementForm.reference?.trim() || null,
      p_notes:
        movementForm.notes?.trim() || null,
    };

    console.log(
      "RPC PARAMETERS:",
      rpcParams
    );

    const { data, error: rpcError } =
      await supabase.rpc(
        "record_inventory_movement",
        rpcParams
      );

    if (rpcError) {
      console.error(
        "record_inventory_movement FULL ERROR:",
        rpcError
      );

      console.error(
        "RPC message:",
        rpcError.message
      );

      console.error(
        "RPC details:",
        rpcError.details
      );

      console.error(
        "RPC hint:",
        rpcError.hint
      );

      console.error(
        "RPC code:",
        rpcError.code
      );

      throw new Error(
        rpcError.message ||
          rpcError.details ||
          "Failed to record stock movement."
      );
    }

    console.log(
      "Movement successfully recorded:",
      data
    );

    await loadProducts();

    closeMovementForm();

    setMessage(
      movement === "IN"
        ? "Stock added successfully. 库存增加成功。"
        : movement === "OUT"
        ? "Stock removed successfully. 库存减少成功。"
        : "Stock adjusted successfully. 库存调整成功。"
    );
  } catch (err) {
    console.error(
      "saveMovement FULL ERROR:",
      err
    );

    setError(
      err?.message ||
        err?.details ||
        "Failed to record stock movement."
    );
  } finally {
    setSaving(false);
  }
}

  /* =======================================================
     HISTORY
  ======================================================= */

  async function loadHistory(product) {
    if (!product?.id) return;

    setSelectedProduct(product);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistory([]);
    setError("");

    try {
      const { data, error: queryError } =
        await supabase
          .from("inventory_movements")
          .select("*")
          .eq("product_id", product.id)
          .order("created_at", {
            ascending: false,
          });

      if (queryError) {
        throw queryError;
      }

      setHistory(data || []);
    } catch (err) {
      console.error(
        "loadHistory error:",
        err
      );

      setError(
        err.message ||
          "Failed to load inventory history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistoryModal() {
    setShowHistoryModal(false);
    setSelectedProduct(null);
    setHistory([]);
  }

  async function removeProduct(product) {
  if (!isAdmin) {
    setError("You do not have permission to remove products.");
    return;
  }

  if (!product?.id || !shopId) {
    setError("Product or shop information is missing.");
    return;
  }

  const confirmed = window.confirm(
    `Remove "${product.name}" (${product.sku}) from inventory?\n\nThe product will be hidden from the active inventory, but its records will remain in the database.`
  );

  if (!confirmed) return;

  setSaving(true);
  setError("");
  setMessage("");

  try {
    const { error } = await supabase
      .from("inventory_products")
      .update({
        active: false,
      })
      .eq("id", product.id)
      .eq("shop_id", shopId);

    if (error) {
      console.error("REMOVE PRODUCT ERROR:", error);

      throw new Error(
        `Could not remove product: ${error.message}`
      );
    }

    setMessage(
      `"${product.name}" has been removed from active inventory.`
    );

    await loadProducts();
  } catch (err) {
    console.error("REMOVE PRODUCT FINAL ERROR:", err);

    setError(
      err?.message ||
        "Something went wrong while removing the product."
    );
  } finally {
    setSaving(false);
  }
}
  /* =======================================================
     CATEGORY LOOKUP
  ======================================================= */

  function getCategoryName(categoryId) {
    const category = categories.find(
      (cat) => cat.id === categoryId
    );

    return category?.name || "Other";
  }

  /* =======================================================
     IMAGE FALLBACK
  ======================================================= */

  function handleImageError(event) {
    console.error(
      "Product image failed to load:",
      event.currentTarget.src
    );

    event.currentTarget.style.display = "none";

    const placeholder =
      event.currentTarget.nextElementSibling;

    if (placeholder) {
      placeholder.style.display = "flex";
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="inventory-page">
      <style>{`
        .inventory-page {
          min-height: 100%;
          padding: 24px;
          background: #111;
          color: #f5f5f5;
          box-sizing: border-box;
        }

        .inventory-container {
          max-width: 1600px;
          margin: 0 auto;
        }

        .inventory-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .inventory-title h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 700;
        }

        .inventory-title p {
          margin: 7px 0 0;
          color: #aaa;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        button {
          font-family: inherit;
        }

        .btn {
          border: 0;
          border-radius: 8px;
          padding: 10px 15px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: .2s ease;
        }

        .btn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #d6ad50;
          color: #111;
        }

        .btn-primary:hover:not(:disabled) {
          background: #e4be67;
        }

        .btn-secondary {
          background: #262626;
          color: #eee;
          border: 1px solid #3a3a3a;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #303030;
        }

        .btn-danger {
          background: #7c2d2d;
          color: #fff;
        }

        .btn-success {
          background: #245b39;
          color: #fff;
        }

        .alert {
          border-radius: 8px;
          padding: 12px 15px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .alert-error {
          background: #3b1c1c;
          border: 1px solid #713535;
          color: #ffb6b6;
        }

        .alert-success {
          background: #173a27;
          border: 1px solid #2e6948;
          color: #a8e4bd;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: #1b1b1b;
          border: 1px solid #2d2d2d;
          border-radius: 10px;
          padding: 18px;
        }

        .stat-label {
          color: #999;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .stat-value {
          margin-top: 8px;
          font-size: 24px;
          font-weight: 700;
        }

        .filters {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 220px 180px;
          gap: 12px;
          margin-bottom: 18px;
        }

        .input,
        .select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          background: #191919;
          color: #eee;
          border: 1px solid #3a3a3a;
          border-radius: 7px;
          padding: 10px 12px;
          outline: none;
        }

        .input:focus,
        .select:focus,
        textarea:focus {
          border-color: #d6ad50;
        }

        textarea {
          min-height: 90px;
          resize: vertical;
        }

        .table-wrapper {
          background: #181818;
          border: 1px solid #2d2d2d;
          border-radius: 10px;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1050px;
        }

        th {
          background: #202020;
          color: #aaa;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .4px;
          padding: 13px 12px;
          white-space: nowrap;
        }

        td {
          padding: 12px;
          border-top: 1px solid #2a2a2a;
          vertical-align: middle;
          font-size: 14px;
        }

        tr:hover td {
          background: #1e1e1e;
        }

        .sku {
          font-family: monospace;
          color: #d6ad50;
          font-weight: 600;
        }

        .product-name-en {
          font-weight: 600;
        }

        .product-name-cn,
        .category-cn {
          color: #999;
          font-size: 12px;
          margin-top: 3px;
        }

        .category-name-wrapper {
          line-height: 1.2;
        }

        .stock-value {
          font-weight: 700;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 20px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-in {
          background: #193c28;
          color: #8fe0aa;
        }

        .status-low {
          background: #4a3818;
          color: #f2ca6d;
        }

        .status-out {
          background: #481e1e;
          color: #ff9d9d;
        }

        .product-photo {
          width: 55px;
          height: 55px;
          border-radius: 7px;
          overflow: hidden;
          border: 1px solid #3a3a3a;
          background: #222;
          cursor: pointer;
          position: relative;
        }

        .product-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 22px;
        }

        .action-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .action-btn {
          border: 1px solid #3a3a3a;
          background: #242424;
          color: #ddd;
          border-radius: 6px;
          padding: 7px 9px;
          cursor: pointer;
          font-size: 12px;
        }

        .action-btn:hover {
          background: #303030;
        }

        .empty-state {
          padding: 60px 20px;
          text-align: center;
          color: #888;
        }

        .loading-state {
          padding: 50px;
          text-align: center;
          color: #aaa;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, .78);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal {
          width: 100%;
          max-width: 650px;
          max-height: 92vh;
          overflow-y: auto;
          background: #181818;
          border: 1px solid #3a3a3a;
          border-radius: 12px;
          box-shadow: 0 20px 70px rgba(0,0,0,.5);
        }

        .modal-large {
          max-width: 900px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          border-bottom: 1px solid #2d2d2d;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .modal-close {
          border: 0;
          background: transparent;
          color: #aaa;
          font-size: 24px;
          cursor: pointer;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 15px 20px;
          border-top: 1px solid #2d2d2d;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 12px;
          color: #aaa;
          font-weight: 600;
        }

        .image-upload {
          border: 1px dashed #555;
          border-radius: 9px;
          padding: 14px;
          background: #141414;
        }

        .image-preview-container {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .image-preview {
          width: 110px;
          height: 110px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #444;
          background: #222;
        }

        .image-upload-info {
          flex: 1;
        }

        .image-upload-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .choose-photo-label {
          display: inline-block;
          background: #d6ad50;
          color: #111;
          border-radius: 6px;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .hidden-file-input {
          display: none;
        }

        .image-note {
          color: #777;
          font-size: 11px;
          line-height: 1.4;
        }

        .movement-product {
          background: #202020;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 13px;
          margin-bottom: 16px;
        }

        .movement-product-name {
          font-weight: 700;
        }

        .movement-product-stock {
          color: #aaa;
          font-size: 12px;
          margin-top: 4px;
        }

        .movement-type-buttons {
          display: flex;
          gap: 8px;
        }

        .movement-type {
          flex: 1;
          border: 1px solid #444;
          background: #222;
          color: #ccc;
          padding: 10px;
          border-radius: 7px;
          cursor: pointer;
          font-weight: 600;
        }

        .movement-type.active {
          background: #d6ad50;
          color: #111;
          border-color: #d6ad50;
        }

        .history-table {
          width: 100%;
          min-width: 600px;
          border-collapse: collapse;
        }

        .history-wrapper {
          overflow-x: auto;
        }

        .history-table td,
        .history-table th {
          padding: 10px;
        }

        .history-in {
          color: #8fe0aa;
          font-weight: 700;
        }

        .history-out {
          color: #ff9d9d;
          font-weight: 700;
        }

        .image-viewer {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-viewer img {
          max-width: 90vw;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 8px;
        }

        .image-viewer-close {
          position: fixed;
          top: 20px;
          right: 25px;
          border: 0;
          background: rgba(0,0,0,.65);
          color: #fff;
          font-size: 30px;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          cursor: pointer;
          z-index: 1002;
        }

        .image-viewer-title {
          position: fixed;
          left: 50%;
          bottom: 25px;
          transform: translateX(-50%);
          background: rgba(0,0,0,.7);
          color: #fff;
          padding: 8px 15px;
          border-radius: 20px;
          font-size: 13px;
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 750px) {
          .inventory-page {
            padding: 14px;
          }

          .inventory-header {
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .filters {
            grid-template-columns: 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full {
            grid-column: auto;
          }
        }
      `}</style>

      <div className="inventory-container">

        {/* HEADER */}
        <div className="inventory-header">
          <div className="inventory-title">
            <h1>
              Inventory 库存
            </h1>

            <p>
              Manage products, stock levels and inventory
              movements.
            </p>
          </div>

          <div className="header-actions">
           {isAdmin && (
  <button
    className="btn btn-secondary"
    onClick={openAddCategory}
  >
    Manage Categories / 管理分类
  </button>
)}

            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={openAddProduct}
              >
                + Add Product / 添加产品
              </button>
            )}
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}

        {/* STATS */}
        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-label">
              Products 产品
            </div>

            <div className="stat-value">
              {stats.totalProducts}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              Total Units 总数量
            </div>

            <div className="stat-value">
              {stats.totalUnits.toLocaleString()}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              Low Stock 库存不足
            </div>

            <div className="stat-value">
              {stats.lowStock}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              Out of Stock 缺货
            </div>

            <div className="stat-value">
              {stats.outOfStock}
            </div>
          </div>

          {showCost && (
            <div className="stat-card">
              <div className="stat-label">
                Inventory Value 库存价值
              </div>

              <div className="stat-value">
                {formatMoney(
                  stats.inventoryValue
                )}
              </div>
            </div>
          )}

        </div>

        {/* FILTERS */}
        <div className="filters">

          <input
            className="input"
            type="text"
            placeholder="Search SKU, product or category... 搜索..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <select
            className="select"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value)
            }
          >
            <option value="all">
              All Categories / 所有分类
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
                {categoryChinese[category.name]
                  ? ` — ${categoryChinese[category.name]}`
                  : ""}
              </option>
            ))}
          </select>

          <select
            className="select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="all">
              All Status / 所有状态
            </option>

            <option value="in">
              In Stock / 库存充足
            </option>

            <option value="low">
              Low Stock / 库存不足
            </option>

            <option value="out">
              Out of Stock / 缺货
            </option>
          </select>

        </div>

        {/* TABLE */}
        <div className="table-wrapper">

          {loading ? (
            <div className="loading-state">
              Loading inventory... 正在加载库存...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              No products found.
              <br />
              没有找到产品。
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    Photo 图片
                  </th>

                  <th>
                    SKU
                  </th>

                  <th>
                    Product 产品
                  </th>

                  <th>
                    Category 分类
                  </th>

                  <th>
                    Stock 库存
                  </th>

                  <th>
                    Min 最低
                  </th>

                  {showCost && (
                    <th>
                      Cost 成本
                    </th>
                  )}

                  <th>
                    Status 状态
                  </th>

                  <th>
                    Actions 操作
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map(
                  (product) => {
                    const categoryName =
                      getCategoryName(
                        product.category_id
                      );

                    const status =
                      getStatus(product);

                    return (
                      <tr
                        key={product.id}
                      >

                        {/* PHOTO */}
                        <td>
                          <div
                            className="product-photo"
                            onClick={() =>
                              product.image_url &&
                              openImageViewer(
                                product.image_url,
                                product.name
                              )
                            }
                          >
                            {product.image_url ? (
                              <>
                                <img
                                  src={product.image_url}
                                  alt={
                                    product.name ||
                                    "Product"
                                  }
                                  onError={
                                    handleImageError
                                  }
                                />

                                <div
                                  className="photo-placeholder"
                                  style={{
                                    display: "none",
                                  }}
                                >
                                  📷
                                </div>
                              </>
                            ) : (
                              <div className="photo-placeholder">
                                📷
                              </div>
                            )}
                          </div>
                        </td>

                        {/* SKU */}
                        <td>
                          <div className="sku">
                            {product.sku || "—"}
                          </div>
                        </td>

                        {/* PRODUCT */}
                        <td>
                          {getProductDisplay(
                            product.name,
                            categoryName
                          )}
                        </td>

                        {/* CATEGORY */}
                        <td>
                          {getCategoryDisplay(
                            categoryName
                          )}
                        </td>

                        {/* STOCK */}
                        <td>
                          <span className="stock-value">
                            {Number(
                              product.current_stock ||
                                0
                            ).toLocaleString()}
                          </span>{" "}
                          <span
                            style={{
                              color: "#777",
                              fontSize: "12px",
                            }}
                          >
                            {product.unit || "pcs"}
                          </span>
                        </td>

                        {/* MIN */}
                        <td>
                          {Number(
                            product.minimum_stock ||
                              0
                          ).toLocaleString()}
                        </td>

                        {/* COST */}
                        {showCost && (
                          <td>
                            {formatMoney(
                              product.cost_price
                            )}
                          </td>
                        )}

                        {/* STATUS */}
                        <td>
                          <span
                            className={`status-badge ${status.className}`}
                          >
                            {status.label}

                            <span
                              style={{
                                opacity: 0.75,
                              }}
                            >
                              /
                            </span>

                            {status.chinese}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td>
                          <div className="action-buttons">

                            {isAdmin && (
                              <button
                                className="action-btn"
                                onClick={() =>
                                  openEditProduct(
                                    product
                                  )
                                }
                              >
                                Edit 编辑
                              </button>
                            )}

                            {canManageStock && (
  <>
    <button
  type="button"
  className={`movement-type ${
    movementType === "IN"
      ? "active"
      : ""
  }`}
  onClick={() =>
    setMovementType("IN")
  }
>
  + Stock In / 入库
</button>

<button
  type="button"
  className={`movement-type ${
    movementType === "OUT"
      ? "active"
      : ""
  }`}
  onClick={() =>
    setMovementType("OUT")
  }
>
  − Stock Out / 出库
</button>
  </>
)}

                            <button
                              className="action-btn"
                              onClick={() =>
                                loadHistory(
                                  product
                                )
                              }
                            >
                              History 历史
                            </button>
<button
  type="button"
  onClick={() => removeProduct(product)}
  disabled={saving}
  style={{
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #dc2626",
    background: "#fff",
    color: "#dc2626",
    cursor: saving ? "not-allowed" : "pointer",
    fontWeight: 600,
  }}
>
  Remove
</button>
                          </div>
                        </td>

                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          )}

        </div>
      </div>

      {/* =====================================================
          PRODUCT MODAL
      ===================================================== */}

      {showProductForm && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !saving
            ) {
              closeProductForm();
            }
          }}
        >
          <div className="modal">

            <div className="modal-header">
              <h2>
                {editingProduct
                  ? "Edit Product / 编辑产品"
                  : "Add Product / 添加产品"}
              </h2>

              <button
                className="modal-close"
                onClick={closeProductForm}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct}>

              <div className="modal-body">

                <div className="form-grid">

                  {/* IMAGE */}
                  <div className="form-group full">

                    <label className="form-label">
                      Product Photo / 产品图片
                    </label>

                    <div className="image-upload">

                      <div className="image-preview-container">

                        {imagePreview ? (
                          <img
                            className="image-preview"
                            src={imagePreview}
                            alt="Product preview"
                            onError={(e) => {
                              e.currentTarget.style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div
                            className="image-preview"
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              color: "#666",
                              fontSize: "30px",
                            }}
                          >
                            📷
                          </div>
                        )}

                        <div className="image-upload-info">

                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: 5,
                            }}
                          >
                            {productImage
                              ? productImage.name
                              : imagePreview
                              ? "Current product image"
                              : "No image selected"}
                          </div>

                          <div className="image-note">
                            JPG, PNG, WEBP or other
                            image files.
                            <br />
                            Maximum size: 5 MB.
                            <br />
                            JPG、PNG、WEBP等图片，
                            最大5MB。
                          </div>

                          <div className="image-upload-actions">

                            <label className="choose-photo-label">
                              Choose Photo /
                              选择图片

                              <input
                                className="hidden-file-input"
                                type="file"
                                accept="image/*"
                                onChange={
                                  handleProductImageChange
                                }
                              />
                            </label>

                            {(imagePreview ||
                              productImage) && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={
                                  removeProductImage
                                }
                                disabled={saving}
                              >
                                Remove / 删除
                              </button>
                            )}

                          </div>

                        </div>

                      </div>

                    </div>
                  </div>

                  {/* SKU */}
                  <div className="form-group">
                    <label className="form-label">
                      SKU *
                    </label>

                    <input
                      className="input"
                      name="sku"
                      value={productForm.sku}
                      onChange={
                        handleProductFormChange
                      }
                      placeholder="e.g. PPF-001"
                      required
                    />
                  </div>

                  {/* NAME */}
                  <div className="form-group">
                    <label className="form-label">
                      Product Name 产品名称 *
                    </label>

                    <input
                      className="input"
                      name="name"
                      value={productForm.name}
                      onChange={
                        handleProductFormChange
                      }
                      placeholder="Product name"
                      required
                    />
                  </div>

                  {/* CATEGORY */}
                  <div className="form-group">
                    <label className="form-label">
                      Category 分类 *
                    </label>

                    <select
                      className="select"
                      name="category_id"
                      value={
                        productForm.category_id
                      }
                      onChange={
                        handleProductFormChange
                      }
                      required
                    >
                      <option value="">
                        Select Category / 选择分类
                      </option>

                      {categories.map(
                        (category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                            {categoryChinese[
                              category.name
                            ]
                              ? ` — ${
                                  categoryChinese[
                                    category.name
                                  ]
                                }`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* UNIT */}
                  <div className="form-group">
                    <label className="form-label">
                      Unit 单位
                    </label>

                    <input
                      className="input"
                      name="unit"
                      value={productForm.unit}
                      onChange={
                        handleProductFormChange
                      }
                      placeholder="pcs"
                    />
                  </div>

                  {/* COST */}
                  <div className="form-group">
                    <label className="form-label">
                      Cost Price 成本价
                    </label>

                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="cost_price"
                      value={
                        productForm.cost_price
                      }
                      onChange={
                        handleProductFormChange
                      }
                      placeholder="0.00"
                    />
                  </div>

                  {/* STOCK */}
                  <div className="form-group">
                    <label className="form-label">
                      Current Stock 当前库存
                    </label>

                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="current_stock"
                      value={
                        productForm.current_stock
                      }
                      onChange={
                        handleProductFormChange
                      }
                      placeholder="0"
                    />
                  </div>

                  {/* MIN */}
                  <div className="form-group">
                    <label className="form-label">
                      Minimum Stock 最低库存
                    </label>

                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="minimum_stock"
                      value={
                        productForm.minimum_stock
                      }
                      onChange={
                        handleProductFormChange
                      }
                      placeholder="0"
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div className="form-group full">
                    <label className="form-label">
                      Description 描述
                    </label>

                    <textarea
                      name="description"
                      value={
                        productForm.description
                      }
                      onChange={
                        handleProductFormChange
                      }
                      placeholder="Optional product description..."
                    />
                  </div>

                </div>

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeProductForm}
                  disabled={saving}
                >
                  Cancel / 取消
                </button>

                <button
  type="submit"
  className={`btn ${
    movementType === "IN"
      ? "btn-success"
      : "btn-danger"
  }`}
  disabled={saving}
>
  {saving
    ? "Saving..."
    : movementType === "IN"
    ? "Add Stock / 入库"
    : "Remove Stock / 出库"}
</button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =====================================================
          STOCK MOVEMENT MODAL
      ===================================================== */}

      {showMovementForm && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !saving
            ) {
              closeMovementForm();
            }
          }}
        >
          <div className="modal">

            <div className="modal-header">
              <h2>
                Stock Movement / 库存变动
              </h2>

              <button
                className="modal-close"
                onClick={closeMovementForm}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveMovement}>

              <div className="modal-body">

                {selectedProduct && (
                  <div className="movement-product">

                    <div className="movement-product-name">
                      {selectedProduct.name}
                    </div>

                    <div
                      style={{
                        color: "#d6ad50",
                        fontSize: "12px",
                        marginTop: 3,
                      }}
                    >
                      SKU: {selectedProduct.sku}
                    </div>

                    <div className="movement-product-stock">
                      Current Stock / 当前库存:{" "}
                      <strong>
                        {Number(
                          selectedProduct.current_stock ||
                            0
                        ).toLocaleString()}
                      </strong>{" "}
                      {selectedProduct.unit || "pcs"}
                    </div>

                  </div>
                )}

                <div className="form-grid">

                  <div className="form-group full">

                    <label className="form-label">
                      Movement Type / 变动类型
                    </label>

                    <div className="movement-type-buttons">

                      <button
                        type="button"
                        className={`movement-type ${
                          movementType === "in"
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setMovementType("in")
                        }
                      >
                        + Stock In / 入库
                      </button>

                      <button
                        type="button"
                        className={`movement-type ${
                          movementType === "out"
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setMovementType("out")
                        }
                      >
                        − Stock Out / 出库
                      </button>

                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Quantity 数量 *
                    </label>

                    <input
                      className="input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      name="quantity"
                      value={
                        movementForm.quantity
                      }
                      onChange={
                        handleMovementFormChange
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Unit Cost 单位成本
                    </label>

                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="unit_cost"
                      value={
                        movementForm.unit_cost
                      }
                      onChange={
                        handleMovementFormChange
                      }
                    />
                  </div>

                  <div className="form-group full">
                    <label className="form-label">
                      Reference 参考
                    </label>

                    <input
                      className="input"
                      name="reference"
                      value={
                        movementForm.reference
                      }
                      onChange={
                        handleMovementFormChange
                      }
                      placeholder="Invoice, PO, supplier, etc."
                    />
                  </div>

                  <div className="form-group full">
                    <label className="form-label">
                      Notes 备注
                    </label>

                    <textarea
                      name="notes"
                      value={
                        movementForm.notes
                      }
                      onChange={
                        handleMovementFormChange
                      }
                      placeholder="Optional notes..."
                    />
                  </div>

                </div>

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={
                    closeMovementForm
                  }
                  disabled={saving}
                >
                  Cancel / 取消
                </button>

                <button
                  type="submit"
                  className={`btn ${
                    movementType === "in"
                      ? "btn-success"
                      : "btn-danger"
                  }`}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : movementType === "in"
                    ? "Add Stock / 入库"
                    : "Remove Stock / 出库"}
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
  <div
    className="modal-overlay"
    onMouseDown={(e) => {
      if (
        e.target === e.currentTarget &&
        !saving
      ) {
        closeCategoryForm();
      }
    }}
  >
    <div className="modal">

      <div className="modal-header">
        <h2>
          Categories / 分类
        </h2>

        <button
          className="modal-close"
          onClick={closeCategoryForm}
          disabled={saving}
        >
          ×
        </button>
      </div>

      <div className="modal-body">

        {/* ACTIVE CATEGORIES */}
        <div
          style={{
            marginBottom: "22px",
          }}
        >
          <div
            className="form-label"
            style={{
              marginBottom: "10px",
              fontSize: "14px",
            }}
          >
            Active Categories / 当前分类
          </div>

          {categories.length === 0 ? (
            <div
              style={{
                padding: "15px",
                border: "1px solid #333",
                borderRadius: "8px",
                color: "#888",
              }}
            >
              No active categories.
              <br />
              没有活动分类。
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {categories.map((category) => (
                <div
                  key={category.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px",
                    background: "#202020",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      {category.name}
                    </div>

                    <div
                      style={{
                        color: "#999",
                        fontSize: "12px",
                        marginTop: "3px",
                      }}
                    >
                      {categoryChinese[
                        category.name
                      ] || "—"}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() =>
                      removeCategory(category)
                    }
                    disabled={saving}
                    style={{
                      padding:
                        "7px 11px",
                      fontSize: "12px",
                    }}
                  >
                    Remove / 删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ADD CATEGORY */}
        <div
          style={{
            borderTop:
              "1px solid #333",
            paddingTop: "20px",
          }}
        >
          <div
            className="form-label"
            style={{
              marginBottom: "10px",
              fontSize: "14px",
            }}
          >
            Add Category / 添加分类
          </div>

          {availableCategoriesToAdd.length ===
          0 ? (
            <div
              style={{
                padding: "12px",
                background: "#173a27",
                border:
                  "1px solid #2e6948",
                borderRadius: "8px",
                color: "#a8e4bd",
                fontSize: "13px",
              }}
            >
              All six categories are active.
              <br />
              六个分类都已启用。
            </div>
          ) : (
            <form onSubmit={saveCategory}>
              <div className="form-group">

                <label className="form-label">
                  Category 分类
                </label>

                <select
                  className="select"
                  value={categoryName}
                  onChange={(e) =>
                    setCategoryName(
                      e.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select Category / 选择分类
                  </option>

                  {availableCategoriesToAdd.map(
                    (category) => (
                      <option
                        key={category.name}
                        value={category.name}
                      >
                        {category.name} —{" "}
                        {category.chinese}
                      </option>
                    )
                  )}
                </select>

              </div>

              <div
                style={{
                  marginTop: "15px",
                  display: "flex",
                  justifyContent:
                    "flex-end",
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    saving ||
                    !categoryName
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Add Category / 添加分类"}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

      <div className="modal-footer">

        <button
          type="button"
          className="btn btn-secondary"
          onClick={closeCategoryForm}
          disabled={saving}
        >
          Close / 关闭
        </button>

      </div>

    </div>
  </div>
)}

      {/* =====================================================
          HISTORY MODAL
      ===================================================== */}

      {showHistoryModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              closeHistoryModal();
            }
          }}
        >
          <div className="modal modal-large">

            <div className="modal-header">

              <h2>
                Inventory History / 库存历史
                {selectedProduct
                  ? ` — ${selectedProduct.name}`
                  : ""}
              </h2>

              <button
                className="modal-close"
                onClick={
                  closeHistoryModal
                }
              >
                ×
              </button>

            </div>

            <div className="modal-body">

              {historyLoading ? (
                <div className="loading-state">
                  Loading history...
                  <br />
                  正在加载历史记录...
                </div>
              ) : history.length === 0 ? (
                <div className="empty-state">
                  No inventory movements found.
                  <br />
                  没有库存变动记录。
                </div>
              ) : (
                <div className="history-wrapper">

                  <table className="history-table">

                    <thead>
                      <tr>
                        <th>
                          Date 日期
                        </th>

                        <th>
                          Type 类型
                        </th>

                        <th>
                          Quantity 数量
                        </th>

                        <th>
                          Unit Cost 单位成本
                        </th>

                        <th>
                          Reference 参考
                        </th>

                        <th>
                          Notes 备注
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {history.map(
                        (movement) => {

                          const type =
                            String(
                              movement.movement_type ||
                                movement.type ||
                                ""
                            ).toLowerCase();

                          const isIn =
                            type === "in" ||
                            type === "stock_in" ||
                            type === "purchase" ||
                            type === "receive";

                          return (
                            <tr
                              key={
                                movement.id
                              }
                            >

                              <td>
                                {movement.created_at
                                  ? new Date(
                                      movement.created_at
                                    ).toLocaleString(
                                      "en-QA"
                                    )
                                  : "—"}
                              </td>

                              <td>
                                <span
                                  className={
                                    isIn
                                      ? "history-in"
                                      : "history-out"
                                  }
                                >
                                  {isIn
                                    ? "+ IN / 入库"
                                    : "- OUT / 出库"}
                                </span>
                              </td>

                              <td>
                                {Number(
                                  movement.quantity ||
                                    0
                                ).toLocaleString()}
                              </td>

                              <td>
                                {showCost
                                  ? formatMoney(
                                      movement.unit_cost
                                    )
                                  : "—"}
                              </td>

                              <td>
                                {movement.reference ||
                                  "—"}
                              </td>

                              <td>
                                {movement.notes ||
                                  "—"}
                              </td>

                            </tr>
                          );
                        }
                      )}
                    </tbody>

                  </table>

                </div>
              )}

            </div>

            <div className="modal-footer">

              <button
                className="btn btn-secondary"
                onClick={
                  closeHistoryModal
                }
              >
                Close / 关闭
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          LARGE IMAGE VIEWER
      ===================================================== */}

      {selectedImage && (
        <div
          className="modal-overlay"
          onClick={closeImageViewer}
        >

          <button
            className="image-viewer-close"
            onClick={closeImageViewer}
          >
            ×
          </button>

          <div
            className="image-viewer"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <img
              src={selectedImage.url}
              alt={selectedImage.name}
            />

            <div className="image-viewer-title">
              {selectedImage.name}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
