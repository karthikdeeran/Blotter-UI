import React, { useState, useRef, useCallback, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const API = "http://localhost:8080/api/blotter/stream";

export default function BlotterPageStream() {
  const gridRef = useRef(null);
  const gridApiRef = useRef(null);

  const [rowData, setRowData] = useState([]); // ✅ main React state
  const [streaming, setStreaming] = useState(false);
  const [product, setProduct] = useState("");
  const [tradeId, setTradeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(100);
  const [hasMore, setHasMore] = useState(true);
  const [controller, setController] = useState(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const countRef = useRef(0);

  const columns = [
    { field: "tradeId", headerName: "Trade ID", width: 150 },
    { field: "product", headerName: "Product", width: 120 },
    { field: "transactionDate", headerName: "Transaction Date", width: 200 },
    { field: "premium", headerName: "Premium", width: 120 },
    { field: "summaryDelta", headerName: "Δ", width: 90 },
    { field: "summaryVega", headerName: "Vega", width: 90 },
    { field: "summaryGamma", headerName: "Γ", width: 90 },
  ];

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
  }, []);

  // ======================================================
  // 🧠 Stream NDJSON Data
  // ======================================================
  const fetchPage = useCallback(
    async (pageNumber) => {
      const params = new URLSearchParams();
      if (tradeId) params.append("tradeId", tradeId);
      if (product) params.append("product", product);
      if (fromDate) params.append("fromDate", `${fromDate}T00:00:00`);
      if (toDate) params.append("toDate", `${toDate}T23:59:59`);
      params.append("page", pageNumber);
      params.append("size", pageSize);

      const url = `${API}?${params.toString()}`;
      console.log("🌐 Streaming from:", url);

      const abortCtrl = new AbortController();
      setController(abortCtrl);
      setStreaming(true);

      try {
        const response = await fetch(url, {
          headers: { Accept: "application/x-ndjson" },
          signal: abortCtrl.signal,
        });

        if (!response.ok) {
          console.error("❌ Server error:", response.status);
          setHasMore(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const trade = JSON.parse(line);

              // ✅ Append to grid efficiently
              gridApiRef.current?.applyTransactionAsync({ add: [trade] });

              countRef.current++;
              if (countRef.current % 100 === 0) {
                setLoadedCount(countRef.current);
              }
            } catch (e) {
              console.error("❌ Invalid JSON:", line);
            }
          }
        }

        console.log("✅ Stream completed for page:", pageNumber);
      } catch (err) {
        if (err.name === "AbortError") console.log("🛑 Stream manually stopped");
        else console.error("❌ Stream error:", err);
      } finally {
        setStreaming(false);
      }
    },
    [tradeId, product, fromDate, toDate, pageSize]
  );

  const onScroll = useCallback(
    (event) => {
      const { scrollTop, clientHeight, scrollHeight } = event.target;
      if (scrollTop + clientHeight >= scrollHeight - 100 && !streaming && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPage(nextPage);
      }
    },
    [page, streaming, hasMore, fetchPage]
  );

  useEffect(() => {
    const gridElement = document.querySelector(".ag-body-viewport");
    if (gridElement) gridElement.addEventListener("scroll", onScroll);
    return () => gridElement?.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  // ======================================================
  // 🔍 Search Handler
  // ======================================================
  const handleSearch = () => {
    if (controller) controller.abort();
    countRef.current = 0;
    setLoadedCount(0);

    // ✅ clear via React state
    setRowData([]);

    // ✅ reset grid immediately if mounted
    gridApiRef.current?.setRowData?.([]); // optional safeguard (for legacy versions)

    setHasMore(true);
    setPage(0);
    fetchPage(0);
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2>📊 Reactive Blotter (NDJSON Streaming)</h2>

      {/* Filters */}
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
          disabled={streaming}
          style={{
            backgroundColor: streaming ? "#b71c1c" : "#1976d2",
            color: "white",
            padding: "6px 14px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {streaming ? "⏹ Stop Stream" : "🔍 Search / Stream"}
        </button>
      </div>

      {/* Info */}
      <div style={{ marginBottom: 10 }}>
        <strong>Status:</strong> {streaming ? "Streaming..." : "Idle"} |{" "}
        <strong>Loaded:</strong> {loadedCount} rows
      </div>

      {/* Grid */}
      <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
        <AgGridReact
          ref={gridRef}
          onGridReady={onGridReady}
          rowData={rowData}
          columnDefs={columns}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
          }}
          animateRows={true}
          pagination={false}
          suppressPaginationPanel={true}
          theme="legacy"
        />
      </div>
    </div>
  );
}
