import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { useParams, useNavigate } from "react-router-dom";

function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carType, setCarType] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");

  const [services, setServices] = useState([]);
  const [serviceDetails, setServiceDetails] = useState({});
  const [serviceList, setServiceList] = useState([]);

  const [source, setSource] = useState("");
  const [otherSource, setOtherSource] = useState("");

  useEffect(() => {
    loadJob();
    loadServices();
  }, [id]);

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*");

    if (error) {
      console.error("LOAD SERVICES ERROR:", error);
      return;
    }

    setServiceList(data || []);
  }

  async function loadJob() {
    setLoading(true);

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("LOAD JOB ERROR:", error);
      setLoading(false);
      return;
    }

    console.log("EDIT JOB:", data);
    console.log("EDIT JOB SERVICES:", data.services);
    console.log("EDIT JOB SERVICE DETAILS:", data.serviceDetails);
    console.log("EDIT JOB SOURCE:", data.source);

    setCustomer(data.customer || "");
    setPhone(data.phone || "");
    setCarModel(data.carModel || "");
    setCarType(data.carType || "");
    setColor(data.color || "");
    setPlate(data.plate || "");

    // Preserve source
   const existingSource = String(data.source || "").trim();

const standardSources = [
  "Teyseer Motors",
  "Teyseer Motors - Bahaa",
  "Teyseer Motors - Salah",
  "Bahaa",
  "Salah",
  "Walk-in"
];

const matchedSource = standardSources.find(
  item => item.toLowerCase() === existingSource.toLowerCase()
);

if (matchedSource) {
  setSource(matchedSource);
  setOtherSource("");
} else if (existingSource) {
  setSource("Other");
  setOtherSource(existingSource);
} else {
  setSource("");
  setOtherSource("");
}

    // Load services
    const existingServices = Array.isArray(data.services)
      ? data.services
      : [];

    setServices(existingServices);

    // Support the new object format
    if (
      data.serviceDetails &&
      typeof data.serviceDetails === "object"
    ) {
      setServiceDetails(data.serviceDetails);
    } else {
      setServiceDetails({});
    }

    setLoading(false);
  }

  function toggleService(serviceItem) {
    const serviceName = serviceItem.name;

    if (services.includes(serviceName)) {
      // Remove service
      setServices((prev) =>
        prev.filter((service) => service !== serviceName)
      );

      // Remove its details
      setServiceDetails((prev) => {
        const copy = { ...prev };
        delete copy[serviceName];
        return copy;
      });
    } else {
      // Add service
      setServices((prev) => [
        ...prev,
        serviceName
      ]);

      setServiceDetails((prev) => ({
        ...prev,
        [serviceName]: {
          price: Number(serviceItem.price || 0),
          discount: 0
        }
      }));
    }
  }

  function updateServicePrice(serviceName, price) {
    setServiceDetails((prev) => ({
      ...prev,
      [serviceName]: {
        ...(prev[serviceName] || {}),
        price: Number(price || 0)
      }
    }));
  }

  function updateServiceDiscount(serviceName, discount) {
    setServiceDetails((prev) => ({
      ...prev,
      [serviceName]: {
        ...(prev[serviceName] || {}),
        discount: Number(discount || 0)
      }
    }));
  }

  async function save() {
    // Calculate total from all services
    const total = services.reduce((sum, serviceName) => {
      const details = serviceDetails[serviceName] || {};

      const price = Number(details.price || 0);
      const discount = Number(details.discount || 0);

      return sum + Math.max(price - discount, 0);
    }, 0);

    const finalSource =
      source === "Other"
        ? otherSource.trim()
        : source;

    const { data, error } = await supabase
      .from("jobs")
      .update({
        customer,
        phone,
        source: finalSource,

        carModel,
        carType,
        color,
        plate,

        services,
        serviceDetails,

        price: total
      })
      .eq("id", id)
      .select()
      .single();

    console.log("UPDATED JOB:", data);
    console.log("UPDATED SERVICES:", data?.services);
    console.log(
      "UPDATED SERVICE DETAILS:",
      data?.serviceDetails
    );
    console.log("UPDATED SOURCE:", data?.source);
    console.log("ERROR:", error);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Job Updated");

    navigate(`/job/${id}`);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.page}>

      <h2>Edit Job #{id}</h2>

      <input
        value={customer}
        onChange={(e) => setCustomer(e.target.value)}
        placeholder="Customer"
      />

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
      />

      <input
        value={carModel}
        onChange={(e) => setCarModel(e.target.value)}
        placeholder="Model"
      />

      <input
        value={carType}
        onChange={(e) => setCarType(e.target.value)}
        placeholder="Type"
      />

      <input
        value={color}
        onChange={(e) => setColor(e.target.value)}
        placeholder="Color"
      />

      <input
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
        placeholder="Plate"
      />

      {/* SOURCE */}

<label style={{ fontWeight: "bold" }}>
  Source
</label>

<select
  value={source}
  onChange={(e) => {
    console.log("SOURCE CHANGED TO:", e.target.value);
    setSource(e.target.value);
  }}
  style={styles.sourceSelect}
>
  <option value="">
    Select Source
  </option>

  <option value="Teyseer Motors">
    Teyseer Motors
  </option>

  <option value="Teyseer Motors - Bahaa">
    Teyseer Motors - Bahaa
  </option>

  <option value="Teyseer Motors - Salah">
    Teyseer Motors - Salah
  </option>

  <option value="Bahaa">
    Bahaa
  </option>

  <option value="Salah">
    Salah
  </option>

  <option value="Walk-in">
    Walk-in
  </option>

  <option value="Other">
    Other
  </option>
</select>

{source === "Other" && (
  <input
    value={otherSource}
    onChange={(e) => setOtherSource(e.target.value)}
    placeholder="Enter source"
    style={styles.input}
  />
)}
      {/* SERVICES */}

      <h3>Services</h3>

      {serviceList.map((item) => {
        const selected = services.includes(item.name);

        const details =
          serviceDetails[item.name] || {
            price: item.price || 0,
            discount: 0
          };

        return (
          <div
            key={item.id}
            style={styles.serviceBox}
          >
            <label>
              <input
                type="checkbox"
                checked={selected}
                onChange={() =>
                  toggleService(item)
                }
              />

              {" "}

              {item.name}
            </label>

            {selected && (
              <div style={styles.serviceDetails}>

                <label>
                  Price
                </label>

                <input
                  type="number"
                  value={details.price || 0}
                  onChange={(e) =>
                    updateServicePrice(
                      item.name,
                      e.target.value
                    )
                  }
                />

                <label>
                  Discount
                </label>

                <input
                  type="number"
                  value={details.discount || 0}
                  onChange={(e) =>
                    updateServiceDiscount(
                      item.name,
                      e.target.value
                    )
                  }
                />

                <div>
                  Final: QAR{" "}
                  {Math.max(
                    Number(details.price || 0) -
                    Number(details.discount || 0),
                    0
                  )}
                </div>

              </div>
            )}

          </div>
        );
      })}

      {/* TOTAL */}

      <div style={styles.total}>
        Total: QAR{" "}
        {services.reduce((sum, serviceName) => {
          const details =
            serviceDetails[serviceName] || {};

          return (
            sum +
            Math.max(
              Number(details.price || 0) -
              Number(details.discount || 0),
              0
            )
          );
        }, 0)}
      </div>

      <button
        onClick={save}
        style={styles.saveButton}
      >
        SAVE CHANGES
      </button>

    </div>
  );
}

const styles = {
  page: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxWidth: "600px"
  },

  serviceBox: {
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "10px"
  },

  serviceDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "10px",
    paddingLeft: "25px"
  },

  total: {
    fontSize: "20px",
    fontWeight: "bold",
    marginTop: "10px"
  },

  saveButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  sourceSelect: {
  padding: "12px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  background: "white",
  color: "#111",
  fontSize: "15px",
  cursor: "pointer"
},

input: {
  padding: "12px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  fontSize: "15px"
},

};

export default EditJob;