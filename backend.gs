// IAPE CASH - BACKEND (Google Apps Script)
// Banco do IAPE (tiers): INFINITY_BLACK e DIAMOND
// - Accounts: account_id, type, name, phone, class, dob, balance, token
// - Transactions: timestamp, account_id, type, amount, balance_after, description
// - Mantem transfer/statement e lookup opcional de produto na planilha Vendas (para descricao)

const SPREADSHEET_ID = '1uxFHZ9fDBwrd2TuwJRyWjw29TxEdiWk8CLvL4oc0bNw';
const ACCOUNTS_SHEET = 'Accounts';
const TRANSACTIONS_SHEET = 'Transactions';
const AUTHORIZED_USERS_SHEET = 'AuthorizedUsers';
const GOOGLE_CLIENT_ID = '433057640119-o2trlpqs7lac8kt2lbseitnm372em89b.apps.googleusercontent.com';

// Coloque aqui os Gmail autorizados como fallback, ou crie a aba AuthorizedUsers
// com uma coluna "email" e uma linha por usuario autorizado.
const AUTHORIZED_EMAILS = [
  // 'seuemail@gmail.com'
];

// Opcional: planilha de vendas para puxar produto na descricao automatica do extrato.
const VENDAS_SPREADSHEET_ID = '16jlJ2aYuvyVl8Y4wSLBL7F2S6VBNgg_beyWD5MZkBgQ';
const VENDAS_SHEET = 'Vendas';
const VENDAS_LOOKBACK_ROWS = 400;
const VENDAS_LOOKBACK_MINUTES = 30;

function doGet(e) {
  e = e || { parameter: {} };
  const action = (e.parameter.action || '').trim();
  if (action === 'card') return handleGetCard(e);
  if (action === 'statement') return handleStatement(e);

  const auth = requireAuthorizedUser_(e);
  if (!auth.success) return jsonResponse(auth);

  if (action === 'createAccount') return handleCreateAccount(e);
  if (action === 'addCredit') return handleAddCredit(e);
  if (action === 'transfer') return handleTransfer(e);
  if (action === 'listAccounts') return handleListAccounts(e);
  if (action === 'updateAccount') return handleUpdateAccount(e);
  if (action === 'deleteAccount') return handleDeleteAccount(e);
  return jsonResponse({ success: false, error: 'Acao invalida' });
}

function doPost(e) {
  return doGet(e);
}

function ensureAccountsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(ACCOUNTS_SHEET);
  if (!sh) sh = ss.insertSheet(ACCOUNTS_SHEET);

  const expected = ['account_id', 'type', 'name', 'phone', 'class', 'dob', 'balance', 'token'];

  if (sh.getLastRow() === 0) {
    sh.appendRow(expected);
    return sh;
  }

  const headerRange = sh.getRange(1, 1, 1, sh.getLastColumn());
  const headers = headerRange.getValues()[0].map(String);

  for (let i = 0; i < expected.length; i++) {
    if (getHeaderIndex_(headers, expected[i]) === -1) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(expected[i]);
      headers.push(expected[i]);
    }
  }
  return sh;
}

function readAccounts_(sh) {
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { headers: data[0] || [], rows: [] };
  return { headers: data[0], rows: data.slice(1) };
}

function handleGetCard(e) {
  const token = (e.parameter.token || '').trim();
  if (!token) return jsonResponse({ success: false, error: 'Token ausente' });

  const sh = ensureAccountsSheet_();
  const { headers, rows } = readAccounts_(sh);

  const idxAccountId = getHeaderIndex_(headers, 'account_id');
  const idxType = getHeaderIndex_(headers, 'type');
  const idxName = getHeaderIndex_(headers, 'name');
  const idxPhone = getHeaderIndex_(headers, 'phone');
  const idxClass = getHeaderIndex_(headers, 'class');
  const idxDob = getHeaderIndex_(headers, 'dob');
  const idxBalance = getHeaderIndex_(headers, 'balance');
  const idxToken = getHeaderIndex_(headers, 'token');

  if ([idxAccountId, idxType, idxName, idxBalance, idxToken].some(i => i === -1)) {
    return jsonResponse({ success: false, error: 'Cabecalho da aba "Accounts" invalido' });
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[idxToken]) === token) {
      return jsonResponse({
        success: true,
        accountId: row[idxAccountId],
        type: row[idxType],
        name: row[idxName],
        phone: idxPhone === -1 ? '' : (row[idxPhone] || ''),
        class: idxClass === -1 ? '' : (row[idxClass] || ''),
        dob: idxDob === -1 ? '' : (row[idxDob] || ''),
        balance: row[idxBalance]
      });
    }
  }

  return jsonResponse({ success: false, error: 'Token nao encontrado' });
}

function handleCreateAccount(e) {
  const name = (e.parameter.name || '').trim();
  const typeRaw = (e.parameter.type || 'INFINITY_BLACK').trim().toUpperCase();
  const phone = (e.parameter.phone || '').trim();
  const classStr = (e.parameter.class || '').trim();
  const dob = (e.parameter.dob || '').trim();
  const initialBalance = parseFloat(e.parameter.initialBalance || '0') || 0;

  if (!name) return jsonResponse({ success: false, error: 'Nome e obrigatorio' });

  const type = typeRaw === 'DIAMOND' ? 'DIAMOND' : 'INFINITY_BLACK';

  const sh = ensureAccountsSheet_();
  const { headers, rows } = readAccounts_(sh);

  const idxAccountId = getHeaderIndex_(headers, 'account_id');
  const idxType = getHeaderIndex_(headers, 'type');
  const idxName = getHeaderIndex_(headers, 'name');
  const idxPhone = getHeaderIndex_(headers, 'phone');
  const idxClass = getHeaderIndex_(headers, 'class');
  const idxDob = getHeaderIndex_(headers, 'dob');
  const idxBalance = getHeaderIndex_(headers, 'balance');
  const idxToken = getHeaderIndex_(headers, 'token');

  const existingTokens = new Set(rows.map(r => String(r[idxToken])));
  let token;
  do {
    token = generateToken_(12);
  } while (existingTokens.has(token));

  const prefix = type === 'DIAMOND' ? 'DIAMOND_' : 'INFB_';
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const accountId = prefix + timestamp;

  const newRow = new Array(headers.length).fill('');
  newRow[idxAccountId] = accountId;
  newRow[idxType] = type;
  newRow[idxName] = name;
  if (idxPhone !== -1) newRow[idxPhone] = phone;
  if (idxClass !== -1) newRow[idxClass] = classStr;
  if (idxDob !== -1) newRow[idxDob] = dob;
  newRow[idxBalance] = initialBalance;
  newRow[idxToken] = token;

  sh.appendRow(newRow);

  if (initialBalance > 0) {
    logTransaction_(accountId, 'CREDIT_INIT', initialBalance, initialBalance, 'Credito inicial');
  }

  return jsonResponse({
    success: true,
    accountId,
    type,
    name,
    phone,
    class: classStr,
    dob,
    balance: initialBalance,
    token
  });
}

function handleAddCredit(e) {
  const tokenOrId = (e.parameter.tokenOrId || '').trim();
  const amount = parseFloat(e.parameter.amount || '0');
  const description = (e.parameter.description || '').trim();

  if (!tokenOrId) return jsonResponse({ success: false, error: 'Informe token ou account_id' });
  if (!amount || isNaN(amount)) return jsonResponse({ success: false, error: 'Valor invalido' });
  if (!description) return jsonResponse({ success: false, error: 'Motivo/description e obrigatorio' });

  const sh = ensureAccountsSheet_();
  const { headers, rows } = readAccounts_(sh);

  const idxAccountId = getHeaderIndex_(headers, 'account_id');
  const idxBalance = getHeaderIndex_(headers, 'balance');
  const idxToken = getHeaderIndex_(headers, 'token');

  let rowIndex = -1;
  let balance = 0;
  let accountId = '';

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const accId = String(r[idxAccountId]);
    const tok = String(r[idxToken]);
    if (tokenOrId === accId || tokenOrId === tok) {
      rowIndex = i + 2;
      balance = parseFloat(r[idxBalance] || '0') || 0;
      accountId = accId;
      break;
    }
  }

  if (rowIndex === -1) return jsonResponse({ success: false, error: 'Conta nao encontrada' });

  const newBalance = balance + amount;
  sh.getRange(rowIndex, idxBalance + 1).setValue(newBalance);

  logTransaction_(accountId, 'CREDIT_ADD', amount, newBalance, description);

  return jsonResponse({ success: true, accountId, balance: newBalance });
}

function handleTransfer(e) {
  const payerToken = (e.parameter.payerToken || '').trim();
  const receiverIdOrToken = (e.parameter.receiverId || '').trim();
  const amount = parseFloat(e.parameter.amount || '0');

  if (!payerToken) return jsonResponse({ success: false, error: 'payerToken obrigatorio' });
  if (!receiverIdOrToken) return jsonResponse({ success: false, error: 'receiverId obrigatorio' });
  if (!amount || isNaN(amount) || amount <= 0) return jsonResponse({ success: false, error: 'Valor invalido' });

  const sh = ensureAccountsSheet_();
  const { headers, rows } = readAccounts_(sh);

  const idxAccountId = getHeaderIndex_(headers, 'account_id');
  const idxBalance = getHeaderIndex_(headers, 'balance');
  const idxToken = getHeaderIndex_(headers, 'token');

  let payerRow = -1;
  let receiverRow = -1;
  let payerBalance = 0;
  let receiverBalance = 0;
  let payerAccountId = '';
  let receiverAccountId = '';

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const accId = String(r[idxAccountId]);
    const tok = String(r[idxToken]);

    if (payerRow === -1 && tok === payerToken) {
      payerRow = i + 2;
      payerBalance = parseFloat(r[idxBalance] || '0') || 0;
      payerAccountId = accId;
    }
    if (receiverRow === -1 && (accId === receiverIdOrToken || tok === receiverIdOrToken)) {
      receiverRow = i + 2;
      receiverBalance = parseFloat(r[idxBalance] || '0') || 0;
      receiverAccountId = accId;
    }
    if (payerRow !== -1 && receiverRow !== -1) break;
  }

  if (payerRow === -1) return jsonResponse({ success: false, error: 'Conta do pagador nao encontrada', code: 'PAYER_NOT_FOUND' });
  if (receiverRow === -1) return jsonResponse({ success: false, error: 'Conta do recebedor nao encontrada', code: 'RECEIVER_NOT_FOUND' });
  if (payerBalance < amount) return jsonResponse({ success: false, error: 'Saldo insuficiente', code: 'INSUFFICIENT_FUNDS', payerBalance, receiverBalance });

  const newPayerBalance = payerBalance - amount;
  const newReceiverBalance = receiverBalance + amount;

  sh.getRange(payerRow, idxBalance + 1).setValue(newPayerBalance);
  sh.getRange(receiverRow, idxBalance + 1).setValue(newReceiverBalance);

  const explicitDesc = (e.parameter.description || '').trim();
  const turmaVenda = (e.parameter.turmaVenda || '').trim();
  const lookupKey = turmaVenda ? turmaVenda : receiverAccountId;
  const produtoDesc = explicitDesc || getLatestProdutoFromVendas_(lookupKey, amount);

  const safe = produtoDesc ? String(produtoDesc).slice(0, 80) : '';
  const debitDesc = safe ? safe : ('Pagamento para ' + receiverAccountId);
  const creditDesc = safe ? ('Recebimento: ' + safe) : ('Recebimento de ' + payerAccountId);

  logTransaction_(payerAccountId, 'DEBIT', -amount, newPayerBalance, debitDesc);
  logTransaction_(receiverAccountId, 'CREDIT', amount, newReceiverBalance, creditDesc);

  return jsonResponse({ success: true, payerBalance: newPayerBalance, receiverBalance: newReceiverBalance });
}

function handleStatement(e) {
  const token = (e.parameter.token || '').trim();
  const limit = parseInt(e.parameter.limit || '20', 10);
  if (!token) return jsonResponse({ success: false, error: 'Token ausente' });

  const shAcc = ensureAccountsSheet_();
  const { headers: hA, rows: rA } = readAccounts_(shAcc);

  const idxAccountId = getHeaderIndex_(hA, 'account_id');
  const idxBalance = getHeaderIndex_(hA, 'balance');
  const idxToken = getHeaderIndex_(hA, 'token');

  let accountId = null;
  let balance = 0;
  for (let i = 0; i < rA.length; i++) {
    const row = rA[i];
    if (String(row[idxToken]) === token) {
      accountId = row[idxAccountId];
      balance = parseFloat(row[idxBalance] || '0') || 0;
      break;
    }
  }
  if (!accountId) return jsonResponse({ success: false, error: 'Conta nao encontrada pelo token' });

  const shTr = ensureTransactionsSheet_();
  const dataTr = shTr.getDataRange().getValues();
  if (dataTr.length < 2) return jsonResponse({ success: true, accountId, balance, items: [] });

  const headersTr = dataTr[0];
  const idxTs = getHeaderIndex_(headersTr, 'timestamp');
  const idxAccIdT = getHeaderIndex_(headersTr, 'account_id');
  const idxType = getHeaderIndex_(headersTr, 'type');
  const idxAmount = getHeaderIndex_(headersTr, 'amount');
  const idxBalAf = getHeaderIndex_(headersTr, 'balance_after');
  const idxDesc = getHeaderIndex_(headersTr, 'description');

  const items = [];
  for (let i = dataTr.length - 1; i >= 1 && items.length < limit; i--) {
    const row = dataTr[i];
    if (String(row[idxAccIdT]) !== String(accountId)) continue;
    const tsValue = row[idxTs];
    const tsStr = tsValue instanceof Date ? tsValue.toISOString() : String(tsValue);
    items.push({
      timestamp: tsStr,
      type: row[idxType],
      amount: parseFloat(row[idxAmount] || '0') || 0,
      balanceAfter: parseFloat(row[idxBalAf] || '0') || 0,
      description: row[idxDesc] || ''
    });
  }

  return jsonResponse({ success: true, accountId, balance, items });
}

function handleListAccounts(e) {
  const sh = ensureAccountsSheet_();
  const { headers, rows } = readAccounts_(sh);

  const idxAccountId = getHeaderIndex_(headers, 'account_id');
  const idxType = getHeaderIndex_(headers, 'type');
  const idxName = getHeaderIndex_(headers, 'name');
  const idxPhone = getHeaderIndex_(headers, 'phone');
  const idxClass = getHeaderIndex_(headers, 'class');
  const idxDob = getHeaderIndex_(headers, 'dob');
  const idxBalance = getHeaderIndex_(headers, 'balance');
  const idxToken = getHeaderIndex_(headers, 'token');

  const accounts = rows.map(r => ({
    accountId: r[idxAccountId],
    type: r[idxType],
    name: r[idxName],
    phone: idxPhone === -1 ? '' : (r[idxPhone] || ''),
    class: idxClass === -1 ? '' : (r[idxClass] || ''),
    dob: idxDob === -1 ? '' : (r[idxDob] || ''),
    balance: r[idxBalance],
    token: r[idxToken]
  }));

  return jsonResponse({ success: true, accounts });
}

function handleUpdateAccount(e) {
  const tokenOrId = (e.parameter.tokenOrId || '').trim();
  if (!tokenOrId) return jsonResponse({ success: false, error: 'Informe token ou account_id' });

  const sh = ensureAccountsSheet_();
  const { headers, rows } = readAccounts_(sh);

  const idxAccountId = getHeaderIndex_(headers, 'account_id');
  const idxType = getHeaderIndex_(headers, 'type');
  const idxName = getHeaderIndex_(headers, 'name');
  const idxPhone = getHeaderIndex_(headers, 'phone');
  const idxClass = getHeaderIndex_(headers, 'class');
  const idxDob = getHeaderIndex_(headers, 'dob');
  const idxBalance = getHeaderIndex_(headers, 'balance');
  const idxToken = getHeaderIndex_(headers, 'token');

  let rowIndex = -1;
  let current = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (tokenOrId === String(r[idxAccountId]) || tokenOrId === String(r[idxToken])) {
      rowIndex = i + 2;
      current = r;
      break;
    }
  }
  if (rowIndex === -1 || !current) return jsonResponse({ success: false, error: 'Conta nao encontrada' });

  const name = (e.parameter.name || '').trim();
  const typeRaw = (e.parameter.type || '').trim().toUpperCase();
  const phone = (e.parameter.phone || '').trim();
  const classStr = (e.parameter.class || '').trim();
  const dob = (e.parameter.dob || '').trim();
  const balanceRaw = (e.parameter.balance || '').trim();

  if (!name) return jsonResponse({ success: false, error: 'Nome e obrigatorio' });

  const type = typeRaw === 'DIAMOND' ? 'DIAMOND' : 'INFINITY_BLACK';
  const oldBalance = parseFloat(current[idxBalance] || '0') || 0;
  const newBalance = balanceRaw === '' ? oldBalance : (parseFloat(balanceRaw) || 0);

  sh.getRange(rowIndex, idxType + 1).setValue(type);
  sh.getRange(rowIndex, idxName + 1).setValue(name);
  if (idxPhone !== -1) sh.getRange(rowIndex, idxPhone + 1).setValue(phone);
  if (idxClass !== -1) sh.getRange(rowIndex, idxClass + 1).setValue(classStr);
  if (idxDob !== -1) sh.getRange(rowIndex, idxDob + 1).setValue(dob);
  sh.getRange(rowIndex, idxBalance + 1).setValue(newBalance);

  const accountId = String(current[idxAccountId]);
  if (Math.abs(newBalance - oldBalance) > 0.0001) {
    logTransaction_(accountId, 'BALANCE_ADJUST', newBalance - oldBalance, newBalance, 'Ajuste administrativo');
  }

  return jsonResponse({
    success: true,
    accountId,
    type,
    name,
    phone,
    class: classStr,
    dob,
    balance: newBalance,
    token: current[idxToken]
  });
}

function handleDeleteAccount(e) {
  const tokenOrId = (e.parameter.tokenOrId || '').trim();
  if (!tokenOrId) return jsonResponse({ success: false, error: 'Informe token ou account_id' });

  const sh = ensureAccountsSheet_();
  const { headers, rows } = readAccounts_(sh);

  const idxAccountId = getHeaderIndex_(headers, 'account_id');
  const idxName = getHeaderIndex_(headers, 'name');
  const idxBalance = getHeaderIndex_(headers, 'balance');
  const idxToken = getHeaderIndex_(headers, 'token');

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (tokenOrId === String(r[idxAccountId]) || tokenOrId === String(r[idxToken])) {
      const accountId = String(r[idxAccountId]);
      const name = String(r[idxName] || '');
      const balance = parseFloat(r[idxBalance] || '0') || 0;
      sh.deleteRow(i + 2);
      logTransaction_(accountId, 'ACCOUNT_DELETE', -balance, 0, 'Conta excluida: ' + name);
      return jsonResponse({ success: true, accountId });
    }
  }

  return jsonResponse({ success: false, error: 'Conta nao encontrada' });
}

function getLatestProdutoFromVendas_(turmaKey, amount) {
  try {
    const key = String(turmaKey || '').trim();
    if (!key) return '';

    const k1 = key;
    const k2 = key.replace(/^TURMA_/, '');
    const k3 = key.toUpperCase().startsWith('TURMA_') ? key.toUpperCase() : ('TURMA_' + key.toUpperCase());
    const k4 = k3.replace(/^TURMA_/, '');

    const ss = SpreadsheetApp.openById(VENDAS_SPREADSHEET_ID);
    const sh = ss.getSheetByName(VENDAS_SHEET);
    if (!sh) return '';

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return '';

    const startRow = Math.max(2, lastRow - VENDAS_LOOKBACK_ROWS + 1);
    const numRows = lastRow - startRow + 1;
    const values = sh.getRange(startRow, 1, numRows, 5).getValues();

    const now = Date.now();
    const maxAgeMs = VENDAS_LOOKBACK_MINUTES * 60 * 1000;
    const EPS = 0.02;

    for (let i = values.length - 1; i >= 0; i--) {
      const row = values[i];
      const dt = row[0];
      const turma = String(row[1] || '').trim();
      const produto = String(row[2] || '').trim();
      const acao = String(row[3] || '').trim().toUpperCase();
      const valor = Number(row[4]) || 0;

      if (!produto) continue;
      if (acao && acao !== 'VENDA') continue;

      const turmaOK = turma === k1 || turma === k2 || turma === k3 || turma === k4;
      if (!turmaOK) continue;

      if (amount && Math.abs(Math.abs(valor) - Math.abs(amount)) > EPS) continue;

      const t = dt instanceof Date ? dt.getTime() : new Date(dt).getTime();
      if (!isFinite(t)) continue;
      if ((now - t) > maxAgeMs) continue;

      return produto;
    }

    for (let i = values.length - 1; i >= 0; i--) {
      const row = values[i];
      const dt = row[0];
      const turma = String(row[1] || '').trim();
      const produto = String(row[2] || '').trim();
      const acao = String(row[3] || '').trim().toUpperCase();

      if (!produto) continue;
      if (acao && acao !== 'VENDA') continue;

      const turmaOK = turma === k1 || turma === k2 || turma === k3 || turma === k4;
      if (!turmaOK) continue;

      const t = dt instanceof Date ? dt.getTime() : new Date(dt).getTime();
      if (!isFinite(t)) continue;
      if ((now - t) > maxAgeMs) continue;

      return produto;
    }

    return '';
  } catch (err) {
    return '';
  }
}

function ensureTransactionsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(TRANSACTIONS_SHEET);
    sh.appendRow(['timestamp', 'account_id', 'type', 'amount', 'balance_after', 'description']);
  }
  return sh;
}

function requireAuthorizedUser_(e) {
  const idToken = (e.parameter.idToken || '').trim();
  if (!idToken) return { success: false, error: 'Login Google obrigatorio', code: 'AUTH_REQUIRED' };

  const payload = verifyGoogleIdToken_(idToken);
  if (!payload.success) return payload;

  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) return { success: false, error: 'Token Google sem email', code: 'AUTH_EMAIL_MISSING' };

  if (!isAuthorizedEmail_(email)) {
    return { success: false, error: 'Email nao autorizado: ' + email, code: 'AUTH_FORBIDDEN', email };
  }

  return { success: true, email };
}

function verifyGoogleIdToken_(idToken) {
  try {
    const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      return { success: false, error: 'Login Google invalido', code: 'AUTH_INVALID' };
    }

    const data = JSON.parse(response.getContentText());
    if (String(data.aud) !== GOOGLE_CLIENT_ID) {
      return { success: false, error: 'Client ID Google invalido', code: 'AUTH_BAD_AUDIENCE' };
    }
    if (String(data.email_verified) !== 'true') {
      return { success: false, error: 'Email Google nao verificado', code: 'AUTH_EMAIL_UNVERIFIED' };
    }

    return { success: true, email: data.email };
  } catch (err) {
    return { success: false, error: 'Falha ao validar login Google', code: 'AUTH_ERROR' };
  }
}

function isAuthorizedEmail_(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;

  const configured = AUTHORIZED_EMAILS
    .map(v => String(v || '').trim().toLowerCase())
    .filter(Boolean);
  if (configured.indexOf(normalized) !== -1) return true;

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(AUTHORIZED_USERS_SHEET);
    if (!sh) return false;

    const values = sh.getDataRange().getValues();
    if (values.length < 2) return false;

    const headers = values[0];
    const idxEmail = getHeaderIndex_(headers, 'email');
    const emailCol = idxEmail === -1 ? 0 : idxEmail;

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][emailCol] || '').trim().toLowerCase() === normalized) return true;
    }
  } catch (err) {
    return false;
  }

  return false;
}

function logTransaction_(accountId, type, amount, balanceAfter, description) {
  const sh = ensureTransactionsSheet_();
  sh.appendRow([new Date(), accountId, type, amount, balanceAfter, description || '']);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function generateToken_(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function getHeaderIndex_(headers, targetName) {
  const target = String(targetName).trim().toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).trim().toLowerCase();
    if (h === target) return i;
  }
  return -1;
}
