import React, { useState, useEffect, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const API = "http://localhost:8080/api/blotter/page";

export default function BlotterPageRest() {
  const [rowData, setRowData] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(100);
  const [tradeId, setTradeId] = useState("");
  const [product, setProduct] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const columns = [
    { field: "tradeId", headerName: "Trade ID", width: 140 },
    { field: "product", headerName: "Product", width: 120 },
    { field: "transactionDate", headerName: "Transaction Date", width: 180 },
    { field: "premium", headerName: "Premium", width: 100 },
    { field: "summaryDelta", headerName: "Δ", width: 90 },
    { field: "summaryVega", headerName: "Vega", width: 90 },
    { field: "summaryGamma", headerName: "Γ", width: 90 },
  ];

  /** =========================================================
   * 🧠 Fetch REST page with query filters
   * ========================================================= */
  const fetchData = useCallback(
    async (pageNumber, reset = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (tradeId) params.append("tradeId", tradeId);
        if (product) params.append("product", product);
        if (fromDate) params.append("fromDate", `${fromDate}T00:00:00`);
        if (toDate) params.append("toDate", `${toDate}T23:59:59`);
        params.append("page", pageNumber);
        params.append("size", pageSize);

        const url = `${API}?${params.toString()}`;
        console.log("🌐 Fetching REST:", url);

        const res = await fetch(url);
        const data = await res.json();
        const total = res.headers.get("X-Total-Count");

        if (reset) setRowData(data);
        else setRowData((prev) => [...prev, ...data]);

        setTotalCount(total);
        setHasMore(data.length >= pageSize);
      } catch (err) {
        console.error("❌ Error fetching REST data", err);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [tradeId, product, fromDate, toDate, pageSize]
  );

  /** =========================================================
   * 🔄 Infinite Scroll
   * ========================================================= */
  const handleScroll = useCallback(
    (e) => {
      const { scrollTop, clientHeight, scrollHeight } = e.target;
      if (scrollTop + clientHeight >= scrollHeight - 100 && !loading && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchData(nextPage);
      }
    },
    [page, loading, hasMore, fetchData]
  );

  /** =========================================================
   * 🚀 Load initial data and scroll listener
   * ========================================================= */
  useEffect(() => {
    fetchData(0, true);
  }, []);

  useEffect(() => {
    const gridElement = document.querySelector(".ag-body-viewport");
    if (gridElement) gridElement.addEventListener("scroll", handleScroll);
    return () => gridElement?.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /** =========================================================
   * 🔍 Handle Search Button
   * ========================================================= */
  const handleSearch = () => {
    setPage(0);
    setRowData([]);
    setHasMore(true);
    fetchData(0, true);
  };

  return (
    <div style={{ padding: "16px" }}>
      <h3>🔁 REST Blotter (Paged with Filters)</h3>

      {/* 🔹 Filter Controls */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <input
          type="text"
          placeholder="Trade ID"
          value={tradeId}
          onChange={(e) => setTradeId(e.target.value)}
        />
        <select value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="">All Products</option>
          <option value="Vanilla">Vanilla</option>
          <option value="Barrier">Barrier</option>
          <option value="Exotic">Exotic</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
        <button
          onClick={handleSearch}
          style={{
            backgroundColor: "#1976d2",
            color: "white",
            padding: "6px 14px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🔍 Search
        </button>
      </div>

      {/* 🔹 Info Summary */}
      <div style={{ marginBottom: 10 }}>
        <strong>Loaded:</strong> {rowData.length} / {totalCount} rows
      </div>

      {/* 🔹 AG Grid */}
      <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columns}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
          }}
          animateRows={true}
          pagination={false}
        />
      </div>
    </div>
  );
}
