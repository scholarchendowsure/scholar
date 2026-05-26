CREATE TABLE "health_check" (
	"id" serial NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hsbc_loan_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_date" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "hsbc_loan_batches_batch_date_unique" UNIQUE("batch_date")
);
--> statement-breakpoint
CREATE TABLE "hsbc_loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" serial NOT NULL,
	"loan_reference" varchar(50) NOT NULL,
	"merchant_id" varchar(50),
	"merchant_name" varchar(255),
	"borrower_name" varchar(255),
	"currency" varchar(10) DEFAULT 'CNY' NOT NULL,
	"loan_date" varchar(20),
	"maturity_date" varchar(20),
	"loan_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(20, 2) DEFAULT '0' NOT NULL,
	"pastdue_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"overdue_days" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'normal' NOT NULL,
	"repayment_schedule" jsonb,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "merchant_sales_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(50) NOT NULL,
	"sales_feishu_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "hsbc_loans" ADD CONSTRAINT "hsbc_loans_batch_id_hsbc_loan_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."hsbc_loan_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hsbc_loan_batches_batch_date_idx" ON "hsbc_loan_batches" USING btree ("batch_date");--> statement-breakpoint
CREATE INDEX "hsbc_loans_batch_id_idx" ON "hsbc_loans" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "hsbc_loans_loan_reference_idx" ON "hsbc_loans" USING btree ("loan_reference");--> statement-breakpoint
CREATE INDEX "hsbc_loans_merchant_id_idx" ON "hsbc_loans" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "hsbc_loans_currency_idx" ON "hsbc_loans" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "hsbc_loans_status_idx" ON "hsbc_loans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "merchant_sales_mappings_merchant_id_idx" ON "merchant_sales_mappings" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "merchant_sales_mappings_sales_feishu_name_idx" ON "merchant_sales_mappings" USING btree ("sales_feishu_name");