import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { LOGIN_MESSAGES, stateForBuyerStatus, stateForSendResult } from "./login-messages.ts";

describe("login: verificação de compradora (D63)", () => {
  test("só compra ativa (ou equipe) libera o envio do link", () => {
    assert.equal(stateForBuyerStatus("active"), null);
    assert.deepEqual(stateForBuyerStatus("none"), { status: "error", message: LOGIN_MESSAGES.notFound });
    assert.deepEqual(stateForBuyerStatus("inactive"), { status: "error", message: LOGIN_MESSAGES.inactive });
  });

  test("falha ao verificar não libera (falha fechada)", () => {
    assert.deepEqual(stateForBuyerStatus("unavailable"), { status: "error", message: LOGIN_MESSAGES.unavailable });
  });

  test("resultado do envio: sucesso, intervalo de 60 s e erro genérico", () => {
    assert.deepEqual(stateForSendResult(null, "a@b.com"), { status: "sent", message: LOGIN_MESSAGES.sent, email: "a@b.com" });
    assert.equal(stateForSendResult({ status: 429 }, "a@b.com").message, LOGIN_MESSAGES.cooldown);
    assert.equal(stateForSendResult({ code: "over_email_send_rate_limit" }, "a@b.com").message, LOGIN_MESSAGES.cooldown);
    assert.equal(stateForSendResult({ code: "unexpected_failure", status: 500 }, "a@b.com").message, LOGIN_MESSAGES.sendFailed);
  });

  test("a mensagem de “não encontrado” é clara e não promete envio", () => {
    assert.match(LOGIN_MESSAGES.notFound, /Não encontramos este e-mail em nenhuma compra/);
    assert.doesNotMatch(LOGIN_MESSAGES.notFound, /enviamos|receber/i);
  });
});
