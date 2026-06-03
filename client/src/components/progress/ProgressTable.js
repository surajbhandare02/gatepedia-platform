import { EmptyState } from "../ui/EmptyState";

// Format Date Properly
function formatDateDisplay(dateString) {

  if (!dateString) return "";

  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

export function ProgressTable({
  rows,
  onEdit,
  onDelete,
  busyId
}) {

  if (!rows.length) {

    return (
      <EmptyState
        title="No sessions match your filters"
        hint="Try clearing search or logging your first session."
      />
    );
  }

  return (

    <div
      className="table-wrap"
      role="region"
      aria-label="Study sessions"
    >

      <table className="data-table">

        <thead>

          <tr>
            <th>Subject</th>
            <th>Topic</th>
            <th className="num">Hours</th>
            <th>Date</th>
            <th className="actions-col">Actions</th>
          </tr>

        </thead>

        <tbody>

          {rows.map((row) => (

            <tr key={row.id}>

              <td data-label="Subject">

                <span className="pill">
                  {row.subject}
                </span>

              </td>

              <td
                data-label="Topic"
                className="topic-cell"
              >
                {row.topic}
              </td>

              <td
                data-label="Hours"
                className="num"
              >
                {row.study_hours}
              </td>

              <td data-label="Date">
                {formatDateDisplay(row.study_date)}
              </td>

              <td
                data-label="Actions"
                className="actions-col"
              >

                <div className="row-actions">

                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => onEdit(row)}
                    disabled={busyId === row.id}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => onDelete(row)}
                    disabled={busyId === row.id}
                  >
                    Delete
                  </button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}