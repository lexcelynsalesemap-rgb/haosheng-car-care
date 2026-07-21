import { useState } from "react";


function Settings(){

  const defaultPrices = {

    "Normal Wash":68,
    "Special Wash":360,
    "Full PPF":6500,
    "Half Body PPF":2800,
    "Full WTT":2500,
    "Full WTT With Sunroof":2800

  };


  const [prices,setPrices] = useState(

    JSON.parse(
      localStorage.getItem("prices")
    ) || defaultPrices

  );


  function updatePrice(service,value){

    setPrices({

      ...prices,

      [service]: Number(value)

    });

  }


  function savePrices(){

    localStorage.setItem(
      "prices",
      JSON.stringify(prices)
    );


    alert("Prices Saved");

  }



  return(

    <div style={{padding:"30px"}}>

      <h1>
        Settings
      </h1>


      <h2>
        Service Prices
      </h2>


      {
        Object.keys(prices).map(service=>(

          <div key={service}>

            <label>
              {service}
            </label>


            <input

              type="number"

              value={prices[service]}

              onChange={(e)=>
                updatePrice(
                  service,
                  e.target.value
                )
              }

            />

          </div>

        ))
      }


      <br/>


      <button onClick={savePrices}>
        SAVE PRICES
      </button>


    </div>

  );

}


export default Settings;