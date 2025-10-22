import { randomUUID } from "node:crypto";
import { Value, type UUID, type ValueType } from "cilivea-value";
import mqtt from "mqtt";
import { exec } from "mqtt-pattern";
export type ClientOpts = { on_connect?: () => void }
export class Client {
    client: mqtt.MqttClient
    constructor(server_url: string, server_port: number, opts?: ClientOpts) {
        this.client = mqtt.connect(server_url, { port: server_port, clientId: "CLIENT-" + randomUUID() })
        if (opts?.on_connect !== undefined) {
            this.client.on("connect", opts.on_connect)
        }
    }

    push_block_data(gateway_id: UUID, block_id: UUID, value_name: string, value: ValueType, qos: 0 | 1 | 2 = 0) {
        this.client.publish(`data/gateways/${gateway_id}/blocks/${block_id}/${value_name}`, Value.serialize(value), { qos }, () => { })
    }

    push_gateway_data(gateway_id: UUID, value_name: string, value: ValueType, qos: 0 | 1 | 2 = 0) {
        this.client.publish(`data/gateways/${gateway_id}/values/${value_name}`, Value.serialize(value), { qos }, () => { })
    }
}

export type GatewayDataReceiveHandler = (gateway_id: UUID, value_name: string, value: ValueType) => void
export type BlockDataReceiveHandler = (gateway_id: UUID, block_id: UUID, value_name: string, value: ValueType) => void
export type ServerOpts = { on_connect?: () => void }
export class Server {
    client: mqtt.MqttClient
    gatewayDataHandlers: GatewayDataReceiveHandler[] = []
    blockDataHandlers: BlockDataReceiveHandler[] = []
    on_connected: (() => void)[] = []

    constructor(broker_url: string, broker_port: number, opts?: ServerOpts) {
        this.client = mqtt.connect(broker_url, { port: broker_port, clientId: "SERVER-" + randomUUID() })

        this.client.on("connect", () => {
            this.client.subscribe("data/gateways/+/blocks/+/+")
            this.client.subscribe("data/gateways/+/values/+")

            if (opts?.on_connect !== undefined) {
                opts.on_connect()
            }
        })


        this.client.on("message", (topic, payload) => {
            let value = Value.deserialize(payload.toString())


            let gateway_params = exec("data/gateways/+gw/values/+name", topic)
            if (gateway_params !== null) {
                this.gatewayDataHandlers.forEach(fn => fn(gateway_params.gw, gateway_params.name, value))
            }

            let block_params = exec("data/gateways/+gw/blocks/+bk/+name", topic)
            if (block_params !== null) {
                this.blockDataHandlers.forEach(fn => fn(block_params.gw, block_params.bk, block_params.name, value))
            }
        })
    }

    on_block_data(fn: BlockDataReceiveHandler) {
        this.blockDataHandlers.push(fn)
    }

    on_gateway_data(fn: GatewayDataReceiveHandler) {
        this.gatewayDataHandlers.push(fn)
    }
}