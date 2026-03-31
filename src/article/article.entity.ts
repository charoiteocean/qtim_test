import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('articles')
export class Article {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column('text')
    description: string;

    @CreateDateColumn()
    publishedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, (user) => user.articles, { eager: true })
    author: User;
}
