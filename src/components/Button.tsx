import React from "react"
import {ButtonProps} from "../types/ButtonProps.ts"

const Button: React.FC<ButtonProps> = ({name, onClickFunction}) => {
    return (
        <button
            style={{
                margin: '20px',
                padding: '12px 24px',
                fontSize: '18px',
                backgroundColor: '#007BFF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
            }}
            onClick={onClickFunction}
        >
            {name}
        </button>
    )
}

export default Button