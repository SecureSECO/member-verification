/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

import request from "supertest";
import { app } from "../app";

describe("GET /", () => {
    it("should return 200 OK", () => {
        return request(app).get("/").expect(200);
    });

    it("should return OK", done => {
        return request(app)
            .get("/")
            .end(function (err, res) {
                expect(res.text).toContain("OK");
                done();
            });
    });
});