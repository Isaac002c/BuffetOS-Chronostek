const pool = require('../config/db');

async function getDashboardStats(tenant_id, month = null, year = null) {
  const now = new Date();
  const currentMonth = month || now.getMonth() + 1;
  const currentYear = year || now.getFullYear();

  const result = await pool.query(
    `SELECT
      (SELECT COALESCE(SUM(total_amount), 0) FROM quotations WHERE tenant_id = $1 AND status = 'approved' AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3) as total_revenue_month,
      (SELECT COALESCE(SUM(total_amount), 0) FROM quotations WHERE tenant_id = $1 AND status = 'approved') as total_revenue_all,
      (SELECT COUNT(*) FROM quotations WHERE tenant_id = $1 AND status IN ('draft', 'pending', 'active')) as open_quotes_count,
      (SELECT COALESCE(SUM(total_amount), 0) FROM quotations WHERE tenant_id = $1 AND status IN ('draft', 'pending', 'active')) as pipeline_value,
      (SELECT COUNT(*) FROM quotations WHERE tenant_id = $1 AND status = 'approved' AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3) as approved_quotes_month,
      (SELECT COUNT(*) FROM quotations WHERE tenant_id = $1 AND status = 'approved') as approved_quotes_all,
      (SELECT COUNT(*) FROM events WHERE tenant_id = $1 AND status = 'confirmed' AND EXTRACT(MONTH FROM event_date) = $2 AND EXTRACT(YEAR FROM event_date) = $3) as confirmed_events_month,
      (SELECT COUNT(*) FROM events WHERE tenant_id = $1 AND status = 'confirmed') as confirmed_events_all
     `,
    [tenant_id, currentMonth, currentYear]
  );

  return result.rows[0];
}

async function getRevenueByMonth(tenant_id, year = null) {
  const currentYear = year || new Date().getFullYear();
  const result = await pool.query(
    `SELECT
       EXTRACT(MONTH FROM created_at)::INT as month,
       COUNT(id) as quotation_count,
       COALESCE(SUM(total_amount), 0) as total_amount
     FROM quotations
     WHERE tenant_id = $1
       AND status = 'approved'
       AND EXTRACT(YEAR FROM created_at) = $2
     GROUP BY EXTRACT(MONTH FROM created_at)
     ORDER BY month ASC`,
    [tenant_id, currentYear]
  );
  return result.rows;
}

async function getLeadPipelineValue(tenant_id) {
  const result = await pool.query(
    `SELECT
      COUNT(*) as open_quotes_count,
      COALESCE(SUM(total_amount), 0) as pipeline_value,
      ROUND(COALESCE(AVG(total_amount), 0), 2) as avg_open_quote_value
     FROM quotations
     WHERE tenant_id = $1
       AND status IN ('draft', 'pending', 'active')`,
    [tenant_id]
  );

  return result.rows[0] || { open_quotes_count: 0, pipeline_value: 0, avg_open_quote_value: 0 };
}

async function getEventTypeBreakdown(tenant_id) {
  // Inclui todos os eventos confirmed do ano corrente (passados e futuros)
  // Antes filtrava só >= mês atual, o que deixava o gráfico vazio para eventos passados
  const result = await pool.query(
    `SELECT
      event_type,
      COUNT(*) as count,
      SUM(guest_count) as total_guests,
      COALESCE(AVG(guest_count), 0)::INT as avg_guests
     FROM events
     WHERE tenant_id = $1
       AND status = 'confirmed'
       AND EXTRACT(YEAR FROM event_date) = EXTRACT(YEAR FROM NOW())
     GROUP BY event_type
     ORDER BY count DESC`,
    [tenant_id]
  );
  return result.rows;
}

async function getSalesByClient(tenant_id, year = null) {
  const currentYear = year || new Date().getFullYear();
  const result = await pool.query(
    `SELECT
      c.id as client_id,
      c.name as client_name,
      COUNT(q.id) as approved_quotes,
      COALESCE(SUM(q.total_amount), 0) as total_sales,
      ROUND(COALESCE(AVG(q.total_amount), 0), 2) as avg_ticket
     FROM clients c
     LEFT JOIN quotations q ON q.client_id = c.id
       AND q.tenant_id = c.tenant_id
       AND q.status = 'approved'
       AND EXTRACT(YEAR FROM q.created_at) = $2
     WHERE c.tenant_id = $1
     GROUP BY c.id, c.name
     ORDER BY total_sales DESC`,
    [tenant_id, currentYear]
  );
  return result.rows;
}

async function getRevenueComparison(tenant_id, year = null) {
  const currentYear = year || new Date().getFullYear();
  const previousYear = currentYear - 1;
  const result = await pool.query(
    `SELECT
      EXTRACT(YEAR FROM created_at)::INT as year,
      EXTRACT(MONTH FROM created_at)::INT as month,
      COALESCE(SUM(total_amount), 0) as amount
     FROM quotations
     WHERE tenant_id = $1
       AND status = 'approved'
       AND EXTRACT(YEAR FROM created_at) IN ($2, $3)
     GROUP BY year, month
     ORDER BY year ASC, month ASC`,
    [tenant_id, previousYear, currentYear]
  );

  const comparison = {};
  for (let month = 1; month <= 12; month += 1) {
    comparison[month] = {
      month,
      previous_year_amount: 0,
      current_year_amount: 0,
    };
  }

  result.rows.forEach((row) => {
    const monthKey = Number(row.month);
    if (row.year === currentYear) {
      comparison[monthKey].current_year_amount = Number(row.amount);
    } else if (row.year === previousYear) {
      comparison[monthKey].previous_year_amount = Number(row.amount);
    }
  });

  const months = Object.values(comparison);
  const totalCurrent = months.reduce((sum, entry) => sum + entry.current_year_amount, 0);
  const totalPrevious = months.reduce((sum, entry) => sum + entry.previous_year_amount, 0);
  const growth = totalPrevious === 0 ? null : Number(((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(2));

  return {
    year: currentYear,
    previousYear,
    months,
    totalCurrent,
    totalPrevious,
    growth,
  };
}

async function getRevenueForecast(tenant_id, months = 6) {
  const result = await pool.query(
    `SELECT
       EXTRACT(YEAR FROM created_at)::INT as year,
       EXTRACT(MONTH FROM created_at)::INT as month,
       COALESCE(SUM(total_amount), 0) as amount
     FROM quotations
     WHERE tenant_id = $1
       AND status = 'approved'
       AND created_at >= NOW() - $2 * INTERVAL '1 month'
     GROUP BY year, month
     ORDER BY year ASC, month ASC`,
    [tenant_id, months]
  );

  const rows = result.rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const average = rows.length ? Number((total / rows.length).toFixed(2)) : 0;

  return {
    months: rows,
    average_monthly_revenue: average,
    forecast_next_month: average,
  };
}

async function getMonthlySummary(tenant_id, month, year) {
  const results = await Promise.all([
    pool.query(
      `SELECT COUNT(*) as count FROM events WHERE tenant_id = $1 AND status = 'confirmed' AND EXTRACT(MONTH FROM event_date) = $2 AND EXTRACT(YEAR FROM event_date) = $3`,
      [tenant_id, month, year]
    ),
    pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as amount FROM quotations WHERE tenant_id = $1 AND status = 'approved' AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3`,
      [tenant_id, month, year]
    ),
    pool.query(
      `SELECT COUNT(*) as count FROM quotations WHERE tenant_id = $1 AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3`,
      [tenant_id, month, year]
    ),
    pool.query(
      `SELECT COUNT(*) as count FROM quotations WHERE tenant_id = $1 AND status = 'approved' AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3`,
      [tenant_id, month, year]
    ),
  ]);

  return {
    month,
    year,
    events_count: Number(results[0].rows[0].count || 0),
    monthly_revenue: Number(results[1].rows[0].amount || 0),
    quotes_created: Number(results[2].rows[0].count || 0),
    approved_quotes: Number(results[3].rows[0].count || 0),
  };
}

async function getConversionMetrics(tenant_id) {
  const result = await pool.query(
    `SELECT
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_quotes,
      COUNT(*) as total_quotes,
      ROUND(
        (COUNT(CASE WHEN status = 'approved' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100),
        2
      ) as conversion_rate
     FROM quotations
     WHERE tenant_id = $1
       AND created_at >= NOW() - INTERVAL '90 days'`,
    [tenant_id]
  );

  return result.rows[0] || { approved_quotes: 0, total_quotes: 0, conversion_rate: 0 };
}

module.exports = {
  getDashboardStats,
  getRevenueByMonth,
  getRevenueComparison,
  getLeadPipelineValue,
  getEventTypeBreakdown,
  getSalesByClient,
  getRevenueForecast,
  getMonthlySummary,
  getConversionMetrics,
};
