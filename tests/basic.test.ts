import { expect, test } from "bun:test"
import { Server, Client } from ".."

test("Basic test", (done) => {
    let gw_id = "gateway"
    let bk_id = "block"
    let bk_name = "value"
    let bk_value = 42
    let gw_name = "status"
    let gw_value = true
    let num_checked = 0

    let c = new Client("mqtt://127.0.0.1", 1884)
    let s = new Server("mqtt://127.0.0.1", 1884, {
        on_connect: () => {
            c.push_gateway_data(gw_id, gw_name, gw_value, 2)
        }
    })

    s.on_block_data((gw, bk, nm, vl) => {
        expect(gw).toBe(gw_id)
        expect(bk).toBe(bk_id)
        expect(nm).toBe(bk_name)
        expect(vl).toBe(bk_value)

        done()
    })

    s.on_gateway_data((gw, nm, vl) => {
        expect(gw).toBe(gw_id)
        expect(nm).toBe(gw_name)
        expect(vl).toBe(gw_value)

        c.push_block_data(gw_id, bk_id, bk_name, bk_value, 2)
    })


})