/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

import request from "supertest";
import { app } from "../app";

describe("Error page", () => {
    it("should return 404 for not existing page", () => {
        return request(app).get("/fake-page")
            .expect(404);
    });
});