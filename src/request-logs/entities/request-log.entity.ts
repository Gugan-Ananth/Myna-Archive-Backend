import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("request_logs")
export class RequestLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Client IP observed on the request. Never sent back in API responses. */
  @Column({ type: "varchar", length: 45 })
  ip!: string;

  @Column({ type: "varchar", length: 16 })
  method!: string;

  /** Path without query string. */
  @Column({ type: "varchar", length: 512 })
  path!: string;

  @Index()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
