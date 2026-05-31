CREATE TABLE "case_files" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"case_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"url" text,
	"data" text,
	"upload_time" varchar(50) NOT NULL,
	"upload_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"case_id" varchar(36) NOT NULL,
	"user_id" varchar(100),
	"user_name" varchar(255) NOT NULL,
	"modified_at" varchar(50) NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"field_label" varchar(255),
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"batch_no" varchar(100) NOT NULL,
	"loan_no" varchar(100) NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"borrower_name" varchar(255) NOT NULL,
	"product_name" varchar(255),
	"platform" varchar(100),
	"payment_company" varchar(255),
	"funder" varchar(255),
	"fund_category" varchar(100),
	"category" varchar(100),
	"overdue_stage" varchar(100),
	"status" varchar(50) NOT NULL,
	"loan_status" varchar(50),
	"is_locked" boolean DEFAULT false,
	"five_level_classification" varchar(50),
	"risk_level" varchar(50),
	"is_extended" boolean DEFAULT false,
	"currency" varchar(10) DEFAULT 'CNY',
	"loan_amount" numeric(20, 2),
	"total_loan_amount" numeric(20, 2),
	"total_outstanding_balance" numeric(20, 2) DEFAULT '0' NOT NULL,
	"total_repaid_amount" numeric(20, 2),
	"outstanding_balance" numeric(20, 2),
	"overdue_amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"overdue_principal" numeric(20, 2),
	"overdue_interest" numeric(20, 2),
	"repaid_amount" numeric(20, 2),
	"repaid_principal" numeric(20, 2),
	"repaid_interest" numeric(20, 2),
	"compensation_amount" numeric(20, 2),
	"loan_term" numeric(10, 0),
	"loan_term_unit" varchar(20),
	"loan_date" varchar(20),
	"due_date" varchar(20),
	"overdue_days" numeric(10, 0) DEFAULT '0' NOT NULL,
	"overdue_start_time" varchar(50),
	"first_overdue_time" varchar(50),
	"compensation_date" varchar(20),
	"company_name" varchar(255),
	"company_address" text,
	"home_address" text,
	"household_address" text,
	"borrower_phone" varchar(50),
	"registered_phone" varchar(50),
	"contact_info" text,
	"assigned_sales" varchar(255),
	"assigned_risk_control" varchar(255),
	"assigned_post_loan" varchar(255),
	"assignee_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "followups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"case_id" varchar(36) NOT NULL,
	"follower" varchar(255) NOT NULL,
	"follow_time" varchar(50) NOT NULL,
	"follow_type" varchar(20) NOT NULL,
	"contact" varchar(50) NOT NULL,
	"follow_result" varchar(50) NOT NULL,
	"follow_record" text NOT NULL,
	"file_info" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_history" ADD CONSTRAINT "case_history_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_files_case_id_idx" ON "case_files" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_files_type_idx" ON "case_files" USING btree ("type");--> statement-breakpoint
CREATE INDEX "case_history_case_id_idx" ON "case_history" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_history_user_id_idx" ON "case_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "case_history_modified_at_idx" ON "case_history" USING btree ("modified_at");--> statement-breakpoint
CREATE INDEX "cases_batch_no_idx" ON "cases" USING btree ("batch_no");--> statement-breakpoint
CREATE INDEX "cases_loan_no_idx" ON "cases" USING btree ("loan_no");--> statement-breakpoint
CREATE INDEX "cases_user_id_idx" ON "cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cases_status_idx" ON "cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cases_borrower_name_idx" ON "cases" USING btree ("borrower_name");--> statement-breakpoint
CREATE INDEX "followups_case_id_idx" ON "followups" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "followups_follower_idx" ON "followups" USING btree ("follower");--> statement-breakpoint
CREATE INDEX "followups_follow_time_idx" ON "followups" USING btree ("follow_time");