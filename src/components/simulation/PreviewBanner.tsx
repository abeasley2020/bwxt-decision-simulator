/**
 * PreviewBanner — shown inside the simulation when an admin is running a
 * preview. Always visible; no close button.
 */
export default function PreviewBanner() {
  return (
    <div
      role="status"
      style={{
        backgroundColor: "#FCEEF0",
        borderBottom: "1px solid #F5C0C7",
        padding: "8px 16px",
        textAlign: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 400,
        fontSize: "13px",
        color: "#A8273A",
        lineHeight: 1.4,
      }}
    >
      Preview mode — your responses will not appear in cohort data
    </div>
  );
}
