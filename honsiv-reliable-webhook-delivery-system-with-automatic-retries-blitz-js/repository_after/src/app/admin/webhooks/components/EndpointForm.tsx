"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@blitzjs/rpc"
import { z } from "zod"
import Form, { FORM_ERROR } from "@/src/app/components/Form"
import LabeledTextField from "@/src/app/components/LabeledTextField"
import LabeledTextAreaField from "@/src/app/components/LabeledTextAreaField"
import createWebhookEndpoint from "@/src/app/webhooks/mutations/createWebhookEndpoint"
import updateWebhookEndpoint from "@/src/app/webhooks/mutations/updateWebhookEndpoint"
import getWebhookEndpoint from "@/src/app/webhooks/queries/getWebhookEndpoint"
import styles from "@/src/app/styles/WebhookAdmin.module.css"

const EndpointSchema = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  secret: z.string().min(8),
  enabled: z.boolean().optional(),
  eventTypesRaw: z.string(),
})

function parseEventTypes(raw: string) {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

export default function EndpointForm({
  mode,
  endpointId,
}: {
  mode: "create" | "edit"
  endpointId?: number
}) {
  const router = useRouter()
  const [create] = useMutation(createWebhookEndpoint)
  const [update] = useMutation(updateWebhookEndpoint)

  const [endpoint] = useQuery(
    getWebhookEndpoint,
    { id: endpointId ?? 0 },
    { enabled: mode === "edit" }
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {mode === "create" ? "New Endpoint" : `Edit Endpoint #${endpointId}`}
        </h1>
      </div>

      <div className={styles.form}>
        <Form
        schema={EndpointSchema}
        initialValues={{
          name: endpoint?.name ?? "",
          url: endpoint?.url ?? "",
          secret: endpoint?.secret ?? "",
          enabled: endpoint?.enabled ?? true,
          eventTypesRaw: endpoint?.eventTypes?.join(", ") ?? "",
        }}
        submitText={mode === "create" ? "Create Endpoint" : "Update Endpoint"}
        onSubmit={async (values) => {
          try {
            const payload = {
              name: values.name,
              url: values.url,
              secret: values.secret,
              enabled: values.enabled ?? true,
              eventTypes: parseEventTypes(values.eventTypesRaw),
            }

            if (mode === "create") {
              await create(payload)
            } else if (endpointId) {
              await update({ id: endpointId, ...payload })
            }

            router.push("/admin/webhooks/endpoints")
          } catch (error) {
            return { [FORM_ERROR]: error instanceof Error ? error.message : "Unable to save endpoint" }
          }
        }}
      >
        <LabeledTextField name="name" label="Name" />
        <LabeledTextField name="url" label="URL" />
        <LabeledTextField name="secret" label="Secret" />
        <LabeledTextAreaField
          name="eventTypesRaw"
          label="Event Types (comma separated)"
          placeholder="invoice.paid, user.created"
        />
      </Form>
      </div>
    </div>
  )
}


