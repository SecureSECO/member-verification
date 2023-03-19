import request from "supertest";
import { app } from "../app";

describe("GET /api/", () => {
    it("should return 200 OK", () => {
        return request(app).get("/api/").expect(200);
    });

    it("should return OK", done => {
        return request(app)
            .get("/api/")
            .end(function (err, res) {
                expect(res.text).toContain("OK");
                done();
            });
    });
});

describe("POST /api/verify", () => {
    it("should fail if address is not valid", () => {
        return request(app)
            .post("/api/verify")
            .send({
                address: "0x123",
                signature: "123",
                nonce: "123",
                providerId: "github",
            })
            .expect(400);
    });

    it("should fail if signature is not valid", done => {
        return request(app)
            .post("/api/verify")
            .send({
                address: "0x2f8Ac045D67209DcC0D7E44bf1ca8bAa4F69E211",
                signature: "123",
                nonce: "123",
                providerId: "github",
            })
            .expect(400)
            .end(function (err, res) {
                expect(res.text).toContain('"ok":false');
                done();
            });
    });
});
