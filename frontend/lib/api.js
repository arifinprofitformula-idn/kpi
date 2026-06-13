let csrfToken = window.APP_CONFIG?.csrfToken || '';

export function setCsrfToken(token) {
  if (typeof token === 'string' && token) csrfToken = token;
}

export async function api(action, payload = {}) {
  let response;
  try {
    response = await fetch('api.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    return { success: false, error: 'Tidak dapat terhubung ke server.', httpStatus: 0 };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: 'Server mengembalikan respons yang tidak valid.', httpStatus: response.status };
  }

  setCsrfToken(data.csrfToken);
  data.httpStatus = response.status;
  return data;
}
